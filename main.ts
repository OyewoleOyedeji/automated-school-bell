import { times, targets } from "./config.json";
import { setHours, isAfter, differenceInMilliseconds, format } from "date-fns";

/**
 * Contains everything needed during the entire runtime of this project.
 * E.g; config, times, startupTime, etc.
 */
class Project {
  constructor() {
    times.length === 0 ? null : (this.config.times = times);
    targets.length === 0 ? null : (this.config.targets = targets);

    if (this.config.times)
      // Convert times provided into a usable format
      times.forEach((time) => {
        const hour: number = new Number(time.split(":")[0]);
        const minutes: number = new Number(time.split(":")[1]);

        this.times.raw.push(
          setHours(this.startupTime, hour).setMinutes(minutes)
        );
      });

    // Sort the raw times in ascending order
    this.times.raw.sort();
  }

  config: { times?: string[] | null; targets?: string[] } = {};
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

// Filter the times, that can be used
project.times.raw.forEach((time) => {
  if (isAfter(time, project.startupTime)) {
    project.times.considered.push(time);
  }
});

/**
 * This method gets called after a wait event has finished.
 *
 * Note: this method cleans up `Project` of unneeded variables
 * @returns
 */
const postWait = () => {
  console.log(`Executed on ${format(new Date(), "k:mm")}`);

  if (project.times.considered.length === 0) {
    ["startupTime", "times", "status", "config"].forEach((key) =>
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
    `Executing next payload in ${format(project.times.considered[0], "k:mm")}`
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

if (project.config.times && project.times.considered.length > 0) wait();
