/* eslint-disable import/no-duplicates */
import express from 'express'
import path from 'path'
import cors from 'cors'
import bodyParser from 'body-parser'
import sockjs from 'sockjs'

import axios from 'axios'
import cookieParser from 'cookie-parser'
import Html from '../client/html'

let connections = []

const port = process.env.PORT || 8080
const server = express()
//  const setHeaders = (/* req, */ res, next) => {
//   res.set('x-skillcrucial-user', '7e61eef1-dc58-44ce-9901-3871cce40541')
//   res.set('Access-Control-Expose-Headers', 'X-SKILLCRUCIAL-USER')
//    next()
// }

const { readFile, writeFile, unlink } = require('fs').promises

const writeUsers = async (data) => {
  return writeFile(`${__dirname}/test.json`, JSON.stringify(data), { encoding: 'utf8' })
}
const readUsers = async () => {
  return readFile(`${__dirname}/test.json`, { encoding: 'utf8' })
    .then((data) => JSON.parse(data))
    .catch(async () => {
      const { data: users } = await axios.get('https://jsonplaceholder.typicode.com/users')
      await writeUsers(users)
      return users
    })
}
// server.use(setHeaders)
server.use(cors())

server.use(express.static(path.resolve(__dirname, '../dist/assets')))
server.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }))
server.use(bodyParser.json({ limit: '50mb', extended: true }))

server.use(cookieParser())

server.get('/api/v1/users', async (req, res) => {
  const users = await readUsers()
  res.set('x-skillcrucial-user', '7e61eef1-dc58-44ce-9901-3871cce40541')
  res.set('Access-Control-Expose-Headers', 'X-SKILLCRUCIAL-USER')
  res.json(users)
})
server.post('/api/v1/users', async (req, res) => {
  const users = await readUsers()
  const newUser = req.body
  newUser.id = +users[users.length - 1].id + 1
  const patchedUsers = [...users, newUser]
  await writeUsers(patchedUsers)
  res.set('x-skillcrucial-user', '7e61eef1-dc58-44ce-9901-3871cce40541')
  res.set('Access-Control-Expose-Headers', 'X-SKILLCRUCIAL-USER')
  res.json({ status: 'success', id: newUser.id, patchedUsers })
})
server.patch('/api/v1/users/:user', async (req, res) => {
  const { user } = req.params
  const newData = req.body
  const users = await readUsers()
  const updateUser = users.map((it) => {
    return it.id === +user ? Object.assign(it, newData) : it
  })
  await writeUsers(updateUser)
  res.set('x-skillcrucial-user', '7e61eef1-dc58-44ce-9901-3871cce40541')
  res.set('Access-Control-Expose-Headers', 'X-SKILLCRUCIAL-USER')
  res.json({ status: 'success', id: user })
})

server.delete('/api/v1/users/:user', async (req, res) => {
  const { user } = req.params
  const users = await readUsers()
  const newArr = users.filter((it) => it.id !== +user)
  await writeUsers(newArr)
  res.set('x-skillcrucial-user', '7e61eef1-dc58-44ce-9901-3871cce40541')
  res.set('Access-Control-Expose-Headers', 'X-SKILLCRUCIAL-USER')
  res.json({ status: 'success', id: user })
})

server.delete('/api/v1/users', async (req, res) => {
  await unlink(`${__dirname}/test.json`)
  res.set('x-skillcrucial-user', '7e61eef1-dc58-44ce-9901-3871cce40541')
  res.set('Access-Control-Expose-Headers', 'X-SKILLCRUCIAL-USER')
  res.json()
})

server.use('/api/', (req, res) => {
  res.status(404)
  res.end()
})

const echo = sockjs.createServer()
echo.on('connection', (conn) => {
  connections.push(conn)
  conn.on('data', async () => {})

  conn.on('close', () => {
    connections = connections.filter((c) => c.readyState !== 3)
  })
})

server.get('/', (req, res) => {
  // const body = renderToString(<Root />);
  const title = 'Server side Rendering'
  res.send(
    Html({
      body: '',
      title
    })
  )
})

server.get('/*', (req, res) => {
  const initialState = {
    location: req.url
  }

  return res.send(
    Html({
      body: '',
      initialState
    })
  )
})

const app = server.listen(port)

echo.installHandlers(app, { prefix: '/ws' })

// eslint-disable-next-line no-console
console.log(`Serving at http://localhost:${port}`)
