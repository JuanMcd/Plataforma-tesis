import express from "express";
import cors from "cors"

import { validateConnection } from "./db.js";
import { getAll, postNewInfo, serviceForTesting } from "./funtions.js";

const app = express()

app.use(express.json())
app.use(cors())

validateConnection()
app.post('/api/postNewInfo', postNewInfo)
app.post('/api/servicesForTesting', serviceForTesting)
app.get('/api/getAllRegister', getAll)

app.listen(5000, () => {
  console.log('Server active');
})
