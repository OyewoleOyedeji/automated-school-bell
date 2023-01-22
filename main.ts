import {
  setHours,
  isAfter,
  differenceInMilliseconds,
  format,
  setSeconds,
} from "date-fns";
import { readFileSync, existsSync, appendFileSync, rmSync } from "fs";
import { resolve } from "path";
import { exit } from "process";
import player from "play-sound";

let times: string[] = [];

const configPath = resolve("config.json");
const logPath = resolve("runtime-error.log");

const writeFile = (filename: string, contents: string) => {
  if (existsSync(logPath)) rmSync(logPath);

  appendFileSync(filename, contents, "utf8");
};

if (existsSync(configPath)) {
  const { times: configTimes }: { times: string[] } = JSON.parse(
    readFileSync(configPath, { encoding: "utf-8" })
  );

  if (!configTimes) {
    writeFile(
      "runtime-error.log",
      `[ERROR] Couldn't find a times property in the ${configPath} file`
    );
    console.error(`Please check ${logPath} for more details`);
    exit(1);
  }

  times = configTimes;
} else {
  writeFile(
    "runtime-error.log",
    `[ERROR] Couldn't find a configuration file at ${resolve()}`
  );
  console.error(`Please check ${logPath} for more details`);
  exit(1);
}

/**
 * Contains everything needed during the entire runtime of this project.
 * E.g; config, times, startupTime, etc.
 */
class Project {
  constructor() {
    if (times.length > 0) {
      // Convert times provided into a usable format
      times.forEach((time) => {
        const hour: number = new Number(time.split(":")[0]);
        const minutes: number = new Number(time.split(":")[1]);

        // Set the amount of hours, minutes and seconds before appending date to <this.times.raw: number[]>
        this.times.raw.push(
          setSeconds(
            new Date(setHours(this.startupTime, hour).setMinutes(minutes)),
            0
          ).getTime()
        );
      });
      // Sort <this.times.raw: number[]> in ascending order
      this.times.raw.sort();

      // Filter the times, that can be used
      this.times.raw.forEach((time) => {
        if (isAfter(time, this.startupTime)) {
          this.times.considered.push(time);
        }
      });
    }
  }
  times: {
    considered: Array<number>;
    raw: Array<number>;
    done: Array<number>;
  } = {
    considered: [],
    raw: [],
    done: [],
  };

  startupTime = new Date();
  status?: Date;
}

const project = new Project();

/**
 * This method gets called after a wait event has finished.
 *
 * Note: this method cleans up `Project` of unneeded variables
 */
const postWait = () => {
  console.log(`Executed on ${format(new Date(), "k:mm:ss")}`);

  player().play("drop.mp3", (err) => console.error(err));

  if (project.times.considered.length === 0) {
    ["startupTime", "times", "status"].forEach((key) =>
      key ? delete project[key] : null
    );
    return;
  }

  wait();
};

/**
 * This method finds the difference between the most recent status
 * and the time of found in the configuration.
 *
 * It then creates a timeout with the amount of time needed, removes
 * the most recent time and executes postWait as a callback
 */
const wait = () => {
  project.status = new Date();

  console.log(
    `Executing next payload in ${format(
      project.times.considered[0],
      "k:mm:ss"
    )}`
  );

  const timeToWait = differenceInMilliseconds(
    project.times.considered[0],
    project.status
  );

  setTimeout(() => {
    project.times.done.push(project.times.considered.shift() as number);
    postWait();
  }, timeToWait);
};

if (project.times.considered.length > 0) wait();
else console.log("Couldn't find an alarm");
