'use client'
import { useState, useEffect } from "react";

export default function Home() {

  const [list, setList] = useState<any[]>([])

  const thStyle = "w-1/6 min-w-[160px] text-lg font-semibold text-white py-4 lg:py-7 px-3 lg:px-4"
  const tdStyle = "text-center text-dark font-medium text-base py-5 px-2 bg-[#F3F6FF] border-b border-l border-[#E8E8E8]"

  useEffect(() => {
    fetch('https://dms.lat/api/getAllRegister')
    .then(data => data.json())
    .then(data => {
      setList(data.data)
    })
    .catch(e => {
      alert('Hubo un error al cargar la informacion, intente mas tarde.')
    })
  }, [])

  return (
    <section className="bg-white p-5">
      <h1 className="text-center text-blue-500 mt-5 font-bold text-5xl">
        Bienvenidos!!!
      </h1>
      <p className="mt-5 font-medium text-2xl">Revisen las ultimas alertas registradas.</p>
      <div className="max-w-full overflow-x-auto">
        <table className="table-auto w-full">
          <thead>
            <tr className="bg-blue-600 text-center">
              <th className={thStyle}>
                ID
              </th>
              <th className={thStyle}>
                Date
              </th>
              <th className={thStyle}>
                ID Image
              </th>
              <th className={thStyle}>
                Message Alert
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((item, index) => (
              <tr key={index}>
                <td className={tdStyle}>
                  {item.id_alert}
                </td>
                <td className={tdStyle}>
                  {
                    new Date(item.created_at).toLocaleString('es-CO', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  }
                </td>
                <td className={tdStyle}>
                  {item.image_name}
                </td>
                <td className={tdStyle}>
                  {item.custom_alert}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
