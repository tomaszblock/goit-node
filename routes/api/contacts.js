const express = require('express')

const router = express.Router()

router.get('/', async (req, res, next) => {
  res.json({ message: 'template mesdsadsadsage' })
})

router.get('/:contactId', async (req, res, next) => {
  res.json({ message: 'template mesadasdssage' })
})

router.post('/', async (req, res, next) => {
  res.json({ message: 'template messasdasdage' })
})

router.delete('/:contactId', async (req, res, next) => {
  res.json({ message: 'template mesasdasdsage' })
})

router.put('/:contactId', async (req, res, next) => {
  res.json({ message: 'template messsaddsaage' })
})

module.exports = router
