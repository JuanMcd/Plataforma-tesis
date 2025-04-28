import "dotenv/config"
import mysql2 from "mysql2/promise"

const username = process.env.DB_USER
const database = process.env.DB_NAME
const password = process.env.DB_PASS
const host = process.env.DB_HOST
const db_port = process.env.DB_PORT

const USER = encodeURIComponent(username)
const PASSWORD = encodeURIComponent(password)

const URI = `mysql://${USER}:${PASSWORD}@${host}:${db_port}/${database}`

export const pool = mysql2.createPool({ uri: URI })
export const validateConnection = () => {
  pool.query('select 1 + 1')
  .then(() => console.log('Connection success!'))
  .catch((error) => console.error('Error connection', error))
}