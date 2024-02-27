const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const dbPath = path.join(__dirname, 'covid19India.db')
const app = express()
let db = null
app.use(express.json())

//Connecting To Database
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is Running')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}
initializeDBAndServer()

//Coverting To Database Object To Response Object
const convertDBObjToResponseObj = dbObj => {
  return {
    stateId: dbObj.state_id,
    stateName: dbObj.state_name,
    population: dbObj.population,
  }
}

//API For Returns a list of all states in the state table
app.get('/states/', async (request, response) => {
  try {
    const getStatesQuery = `
        SELECT 
        *
        FROM 
        state
        ORDER BY 
        state_id
    `
    const dbResponse = await db.all(getStatesQuery)
    response.send(dbResponse.map(each => convertDBObjToResponseObj(each)))
  } catch (e) {
    console.log(e.message)
    response.status(500).send('Internal Server Error')
  }
})

//API FOR Returns a state based on the state ID
app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  try {
    const getStateQuery = `
    SELECT 
    *
    FROM 
    state
    WHERE 
    state_id = ?
  `
    const dbResponse = await db.get(getStateQuery, [stateId])
    response.send(convertDBObjToResponseObj(dbResponse))
  } catch (e) {
    console.log(e.message)
    response.status(500).send('Internal Server Error')
  }
})

//API For Create a district in the district table, district_id is auto-incremented
app.post('/districts/', async (request, response) => {
  const bodyDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = bodyDetails
  try {
    const createDistrictQuery = `
    INSERT INTO 
    district(district_name, state_id, cases, cured, active, deaths)
    VALUES(?, ?, ?, ?, ?, ?)
  `
    const dbResponse = await db.run(createDistrictQuery, [
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    ])
    response.send('District Successfully Added')
  } catch (e) {
    console.log(e.message)
    response.status(500).send('Internal Server Error')
  }
})

//Coverting Database District Object To Response Object
const convertDBDistrictObjToResponseObj = dbObj => {
  return {
    districtId: dbObj.district_id,
    districtName: dbObj.district_name,
    stateId: dbObj.state_id,
    cases: dbObj.cases,
    cured: dbObj.cured,
    active: dbObj.active,
    deaths: dbObj.deaths,
  }
}

//API FOR Returns a district based on the district ID
app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  try {
    const getDistrictQuery = `
      SELECT 
      *
      FROM 
      district
      WHERE 
      district_id = ?
    `
    const dbResponse = await db.get(getDistrictQuery, [districtId])
    response.send(convertDBDistrictObjToResponseObj(dbResponse))
  } catch (e) {
    console.log(e.message)
    response.status(500).send('Internal Server Error')
  }
})

//API FOR Deletes a district from the district table based on the district ID
app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  try {
    const deleteDistrictQuery = `
      DELETE FROM
      district
      WHERE 
      district_id = ?
    `
    const dbResponse = await db.run(deleteDistrictQuery, [districtId])
    response.send('District Removed')
  } catch (e) {
    console.log(e.message)
    response.status(500).send('Internal Server Error')
  }
})

//API FOR Updates the details of a specific district based on the district ID
app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const bodyDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = bodyDetails
  try {
    const updateDistrictQuery = `
      UPDATE
      district
      SET 
      district_name = ?,
      state_id = ?,
      cases = ?,
      cured = ?,
      active = ?,
      deaths = ?
      WHERE 
      district_id = ?
    `
    const dbResponse = await db.run(updateDistrictQuery, [
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
      districtId,
    ])
    response.send('District Details Updated')
  } catch (e) {
    console.log(e.message)
    response.status(500).send('Internal Server Error')
  }
})

//Converting Statistics Object To Response Object
const convertStatisticsObj = obj => {
  return {
    totalCases: obj['SUM(cases)'],
    totalCured: obj['SUM(cured)'],
    totalActive: obj['SUM(active)'],
    totalDeaths: obj['SUM(deaths)'],
  }
}

//API For Returns the statistics of total cases, cured, active, deaths of a specific state based on state ID
app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  try {
    const getStatisticsQuery = `
      SELECT 
      SUM(cases),
      SUM(cured),
      SUM(active),
      SUM(deaths)
      FROM 
      district
      WHERE 
      state_id = ?
    `
    const dbResponse = await db.get(getStatisticsQuery, [stateId])
    response.send(convertStatisticsObj(dbResponse))
  } catch (e) {
    console.log(e.message)
    response.status(500).send('Internal Server Error')
  }
})

//API FOR Returns an object containing the state name of a district based on the district ID
app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  try {
    const getStateIdQuery = `
      SELECT 
      state_id
      FROM 
      district
      WHERE 
      district_id = ?
    `
    const dbResponse1 = await db.get(getStateIdQuery, [districtId])
    const getStateNameQuery = `
      SELECT 
      state_name 
      FROM 
      state
      WHERE 
      state_id = ?
    `
    const dbResponse = await db.get(getStateNameQuery, [dbResponse1.state_id])
    response.send({
      stateName: dbResponse.state_name,
    })
  } catch (e) {
    console.log(e.message)
    response.status(500).send('Internal Server Error')
  }
})

module.exports = app
