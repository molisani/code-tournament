import { TournamentRound, TournamentTrial } from "./core/tournaments";
import { FootballFieldFactory, FootballGameConfig, FootballGameFactory } from "./projects/football/core/game";
import { GreedyTeamFactory } from "./projects/football/groups/f15_g7/greedy-team";
import { DumbTeamFactory } from "./projects/football/groups/sample/dumb-team";

const teamFactories = [
  GreedyTeamFactory,
  DumbTeamFactory,
  GreedyTeamFactory,
  DumbTeamFactory,
];

const config: FootballGameConfig = {
  fieldLength: 32,
  kickDistance: 6,
  teamPlayers: 15,
  timeLimit: 200000,
};

const round = new TournamentRound(FootballFieldFactory, FootballGameFactory, teamFactories, config);
const trial = new TournamentTrial(round, 0);

const results = trial.run();

for (const result of results) {
  console.log(result.className, result.metrics);
}
