import {
  setHours,
  isAfter,
  differenceInMilliseconds,
  setSeconds,
} from "date-fns";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { resolve, isAbsolute } from "path";
import { exit } from "process";
import player from "play-sound";

let times: string[] = [];
let notificationSoundPath: string;

const configPath = resolve("config.json");
const logPath = resolve("runtime-error.log");

const writeLogFile = (content: string) => {
  writeFileSync("runtime-error.log", content);
  console.error(`Please check ${logPath} for more details`);
  exit(1);
};

if (existsSync(configPath)) {
  const {
    times: configTimes,
    notificationSound,
  }: { times: string[]; notificationSound: string } = JSON.parse(
    readFileSync(configPath, { encoding: "utf-8" })
  );

  if (!notificationSound)
    writeLogFile(
      `[ERROR] Couldn't find the path to the sound for the notifications in the ${configPath}`
    );

  if (!configTimes)
    writeLogFile(`[ERROR] Couldn't find a times property in the ${configPath}`);

  isAbsolute(notificationSound)
    ? (notificationSoundPath = notificationSound)
    : (notificationSoundPath = resolve(notificationSound));

  if (!existsSync(notificationSoundPath))
    writeLogFile(`[ERROR] The sound file for notifications doesn't exist`);

  times = configTimes;
} else
  writeLogFile(`[ERROR] Couldn't find a configuration file at ${resolve()}`);

/**
 * Contains everything needed during the entire runtime of this project.
 * E.g; config, times, startupTime, etc.
 */
class Runtime {
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

const runtime = new Runtime();

/**
 * This method gets called after a wait event has finished.
 *
 * Note: this method cleans up `Runtime` of unneeded variables
 */
const postWait = () => {
  player().play(notificationSoundPath);

  if (runtime.times.considered.length === 0) {
    ["startupTime", "times", "status"].forEach((key) =>
      key ? delete runtime[key] : null
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
  runtime.status = new Date();

  const timeToWait = differenceInMilliseconds(
    runtime.times.considered[0],
    runtime.status
  );

  setTimeout(() => {
    runtime.times.done.push(runtime.times.considered.shift() as number);
    postWait();
  }, timeToWait);
};

if (runtime.times.considered.length > 0) wait();
else console.log("Couldn't find an alarm");
