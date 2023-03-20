const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
const dbPath = path.join(__dirname, "cricketMatchDetails.db");
let db = null;
app.use(express.json());

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error:${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertDbObjectToResponseObject = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
    playerMatchId: dbObject.player_match_id,
    score: dbObject.score,
    fours: dbObject.fours,
    sixes: dbObject.sixes,
  };
};

app.get("/players/", async (request, response) => {
  const getPlayerQuery = `
    SELECT * FROM player_details;`;
  const playerArray = await db.all(getPlayerQuery);
  response.send(
    playerArray.map((eachPlayer) => convertDbObjectToResponseObject(eachPlayer))
  );
});

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `
    SELECT * FROM player_details WHERE player_id=${playerId};`;
  const playerDetails = await db.get(getPlayerQuery);
  response.send(convertDbObjectToResponseObject(playerDetails));
});

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const playerDetails = request.body;
  const { playerName } = playerDetails;
  const updatePlayerQuery = `
  UPDATE 
        player_details
    SET
       player_name="${playerName}"
    WHERE 
        player_id=${playerId};`;
  await db.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchQuery = `
    SELECT * FROM match_details WHERE match_id=${matchId};`;
  const matchDetails = await db.get(getMatchQuery);
  response.send(convertDbObjectToResponseObject(matchDetails));
});

app.get("/players/:playerId/matches/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `
    SELECT 
        match_id,match,year
    FROM 
        player_match_score 
        NATURAL JOIN match_details
    WHERE 
        player_id=${playerId};`;
  const playerMatchArray = await db.all(getPlayerQuery);
  response.send(
    playerMatchArray.map((eachPlayer) =>
      convertDbObjectToResponseObject(eachPlayer)
    )
  );
});

app.get("/matches/:matchId/players/", async (request, response) => {
  const { matchId } = request.params;
  const getPlayerQuery = `
    SELECT player_id,player_name
    FROM player_match_score
        NATURAL JOIN player_details
    WHERE match_id=${matchId};`;
  const playerMatchArray = await db.all(getPlayerQuery);
  response.send(
    playerMatchArray.map((eachPlayer) =>
      convertDbObjectToResponseObject(eachPlayer)
    )
  );
});

app.get("/players/:playerId/playerScores/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `
    SELECT 
        player_details.player_id as playerId,
        player_details.player_name as playerName,
        SUM(player_match_score.score) as totalScore,
        SUM(player_match_score.fours) as totalFours,
        SUM(player_match_score.sixes) as totalSixes
    FROM player_details INNER JOIN player_match_score 
        ON player_details.player_id=player_match_score.player_id
    WHERE player_details.player_id=${playerId};`;
  const playerDetails = await db.get(getPlayerQuery);
  response.send(playerDetails);
});

module.exports = app;
