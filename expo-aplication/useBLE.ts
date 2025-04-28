/* eslint-disable no-bitwise */
import { useState, useEffect } from "react";
import { PermissionsAndroid, Platform } from "react-native";

import * as ExpoDevice from "expo-device";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import base64 from "react-native-base64";
import { v4 as uuid } from "uuid";

import {
  BleError,
  BleManager,
  Characteristic,
  Device,
} from "react-native-ble-plx";

/* ===  UUIDs del servicio UART BLE  === */
const UART_SERVICE_UUID = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
const UUID_TX = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";

/* ===  Clave de almacenamiento local  === */
const STORAGE_KEY = "@offline_reports";

/* ===  Gestor BLE  === */
const bleManager = new BleManager();

function useBLE() {
  /* ---------- Estados ---------- */
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [color, setColor] = useState("white");

  const [offlineQueue, setOfflineQueue] = useState<any[]>([]); // cola local

  /* ---------- Permisos Android ---------- */
  const requestAndroid31Permissions = async () => {
    const bluetoothScanPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      {
        title: "Bluetooth permission",
        message: "BLE requires Bluetooth scan",
        buttonPositive: "OK",
      }
    );
    const bluetoothConnectPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      {
        title: "Bluetooth permission",
        message: "BLE requires Bluetooth connect",
        buttonPositive: "OK",
      }
    );
    const fineLocationPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: "Location permission",
        message: "BLE requires Location",
        buttonPositive: "OK",
      }
    );

    return (
      bluetoothScanPermission === "granted" &&
      bluetoothConnectPermission === "granted" &&
      fineLocationPermission === "granted"
    );
  };

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      if ((ExpoDevice.platformApiLevel ?? -1) < 31) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Location permission",
            message: "BLE requires Location",
            buttonPositive: "OK",
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        return await requestAndroid31Permissions();
      }
    }
    return true;
  };

  /* ---------- Conexión BLE ---------- */
  const connectToDevice = async (device: Device) => {
    try {
      const deviceConnection = await bleManager.connectToDevice(device.id);
      await deviceConnection.discoverAllServicesAndCharacteristics();

      if (Platform.OS === "android") {
        try {
          await deviceConnection.requestMTU(185);
        } catch {}
      }

      setConnectedDevice(deviceConnection);
      startStreamingData(deviceConnection);
      bleManager.stopDeviceScan();
    } catch (e) {
      console.log("FAILED TO CONNECT", e);
    }
  };

  /* ---------- Escaneo ---------- */
  const isDuplicateDevice = (devices: Device[], nextDevice: Device) =>
    devices.findIndex((d) => nextDevice.id === d.id) > -1;

  const scanForPeripherals = () =>
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log(error);
      }
      if (device && (device.name === "AMB82" || device.localName === "AMB82")) {
        setAllDevices((prev) => {
          if (!isDuplicateDevice(prev, device)) {
            return [...prev, device];
          }
          return prev;
        });
      }
    });

  /* =======================================================
     ===  BLOQUE DE GESTIÓN DE REPORTES & OFFLINE QUEUE  ===
     ======================================================= */

  /* Carga inicial de la cola desde AsyncStorage */
  useEffect(() => {
    (async () => {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) setOfflineQueue(JSON.parse(json));

      // Si ya hay red, intenta vaciar la cola
      const state = await NetInfo.fetch();
      if (state.isInternetReachable) flushQueue();
    })();
  }, []);

  /* Escucha cambios de conectividad para re-intentar envíos */
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      if (state.isInternetReachable) flushQueue();
    });
    return () => unsub();
  }, [offlineQueue]);

  /* ------- Envío de reporte (con manejo offline) ------- */
  const postReport = async (payload: any) => {
    try {
      const res = await fetch("https://dms.lat/api/postNewInfo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
    } catch (err) {
      // Sin red o error -> encola
      const newItem = { id: uuid(), payload };
      const newQueue = [...offlineQueue, newItem];
      setOfflineQueue(newQueue);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newQueue));
    }
  };

  /* ------- Vacía la cola cuando vuelva la red ------- */
  const flushQueue = async () => {
    let queue = [...offlineQueue];
    for (const item of queue) {
      try {
        await postReport(item.payload); // re-usa la misma función
        queue = queue.filter((q) => q.id !== item.id);
      } catch {
        break; // Si falla, salimos y re-intentamos luego
      }
    }
    setOfflineQueue(queue);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  };

  /* ---------- Callback de datos BLE ---------- */
  const onDataUpdate = async (
    error: BleError | null,
    characteristic: Characteristic | null
  ) => {
    if (error) {
      console.log(error);
      return;
    }
    if (!characteristic?.value) {
      console.log("No data received");
      return;
    }

    const decoded = base64.decode(characteristic.value);
    /* Ejemplo trivial para demo de color */
    let viewColor = "white";
    if (decoded === "B") viewColor = "blue";
    else if (decoded === "R") viewColor = "red";
    else if (decoded === "G") viewColor = "green";
    setColor(viewColor);

    /* ----- Construir payload a reportar ----- */
    const payload = {
      event: decoded,                       // aquí iría el tipo de distracción
      ts: new Date().toISOString(),
      img_id: decoded + "_" + Date.now(),   // nombre de imagen (ejemplo)
    };
    await postReport(payload);
  };

  /* ---------- Suscripción a las notificaciones BLE ---------- */
  const startStreamingData = (device: Device) => {
    device.monitorCharacteristicForService(
      UART_SERVICE_UUID,
      UUID_TX,
      onDataUpdate
    );
  };

  /* ---------- API que expondrá el hook ---------- */
  return {
    connectToDevice,
    allDevices,
    connectedDevice,
    color,
    requestPermissions,
    scanForPeripherals,
    startStreamingData,
  };
}

export default useBLE;
