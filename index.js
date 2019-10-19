/**
 *
 * Materials:
 * - 1x Raspberry Pi 3 Model B+
 * - 1x Board
 * - 1x Raspberry Pi GPIO Extension Board (optional)
 * - 3x Buttons
 * - 1x Button cover orange (optional)
 * - 1x Button cover green (optional)
 * - 1x Button cover yellow (optional)
 * - 1x Led blue
 * - 1x Led orange
 * - 1x Led greeen
 * - 1x Led yellow
 * - 7x Resistor 10K
 * - 1x Buzzer
 * - 1x Wire blue
 * - 2x Wires orange
 * - 2x Wires green
 * - 2x Wires yellow
 * - 9x Wires black
 * - 5x Wires red
 * - A lot of curiosity :-)
 *
 * Created by Carlo La Pera
 * October 19th, 2019
 */

const five = require("johnny-five");
const { RaspiIO } = require("raspi-io");
const chalk = require("chalk");
const sleep = require("system-sleep");

const board = new five.Board({
  io: new RaspiIO()
});

// SETUP
const debug = true;

const ledBlue = new five.Led("GPIO18");
const ledOrange = new five.Led("GPIO17");
const ledGreen = new five.Led("GPIO27");
const ledYellow = new five.Led("GPIO22");
const btnOrange = new five.Button("GPIO23");
const btnGreen = new five.Button("GPIO24");
const btnYellow = new five.Button("GPIO25");
const piezo = new five.Piezo("GPIO16");

const speedOrange = 100;
const speedGreen = 250;
const speedYellow = 400;

let speedChosen = 0;
let sequenceDone = false;
let sequence = [];
const sequenceLimit = 5;
const btnLength = 3;
let currentIndex = 0;
let success = false;
let ifFirstMatch = true; // No reset this

// METHODS

/**
 * Print debug message if debug var is true
 * @param {*} message
 */
const printDebug = (message, color = "yellow") => {
  if (debug)
    console.log(chalk[color](`[${new Date().toLocaleString()}] ${message}`));
};

/**
 * Print game message
 * @param {*} message
 * @param {*} color // to see all available colors: https://github.com/chalk/chalk#colors
 */
const printMessage = (message, color = "whiteBright") => {
  console.log(chalk[color](`${message}`));
};

/**
 * Toggle led status, if no parameter is passed set all the LEDs off
 *
 * @param {*} r // Led red
 * @param {*} g // Led green
 * @param {*} y // Led yellow
 */
const ledsToggle = (r = false, g = false, y = false) => {
  if (r === true) ledOrange.on();
  else ledOrange.off();

  if (g === true) ledGreen.on();
  else ledGreen.off();

  if (y === true) ledYellow.on();
  else ledYellow.off();
};

/**
 * Reset all Vars
 */
const resetVars = () => {
  speedChosen = 0;
  sequenceDone = false;
  sequence = [];
  currentIndex = 0;
  success = false;
};

/**
 * Remove all button press listeners and deactivate the blue led
 */
function removeAllBtnListner() {
  btnOrange.removeAllListeners("press");
  btnGreen.removeAllListeners("press");
  btnYellow.removeAllListeners("press");
  sleep(200);
  ledBlue.off();
  ledsToggle();
}

/**
 * Show mesage with the game guide
 */
async function showGuideMessage() {
  if (ifFirstMatch) {
    printMessage(`***********`);
    printMessage(
      `HOW TO PLAY\nThe game consists of guessing a sequence of colors that varies with each match.\nAt each match you will be asked to select the difficulty level which consists of the sequence presentation duration variation (faster = more difficult).`,
      "blueBright"
    );
    printMessage(
      `\nNOTES: Each time the blue LED is on, the system will wait for your input`,
      "cyan"
    );
    printMessage(`***********`);

    await playStart();

    ifFirstMatch = false;
  }
}

/**
 * Manages the selection of the difficulty of the game level by the user
 */
function setGameSpeed() {
  return new Promise((resolve, reject) => {
    printMessage(
      `\n-----------\nSelect the difficulty level of the game by pressing the button\nORANGE: ${speedOrange}ms, GREEN: ${speedGreen}ms, YELLOW: ${speedYellow}ms.\n-----------`
    );
    ledBlue.on();
    btnOrange.once("press", function fn() {
      printDebug(`setGameSpeed - Pressed Orange: ${speedOrange} ms`, "red");
      speedChosen = speedOrange; // ms
      removeAllBtnListner();
      resolve();
    });
    btnGreen.once("press", function fn() {
      printDebug(`setGameSpeed - Pressed Green: ${speedGreen} ms`, "green");
      speedChosen = speedGreen; // ms
      removeAllBtnListner();
      resolve();
    });
    btnYellow.once("press", function fn() {
      printDebug(`setGameSpeed - Pressed Yellow: ${speedYellow} ms`, "yellow");
      speedChosen = speedYellow; // ms
      removeAllBtnListner();
      resolve();
    });
  });
}

/**
 * Waits for the user to be ready to repeat the sequence that will be generated
 */
function userIsReady() {
  printMessage(
    `\nAs soon as you feel ready, click any button and memorize the sequence.`,
    "blue"
  );
  ledBlue.on();
  return new Promise((resolve, reject) => {
    btnOrange.once("press", function fn() {
      removeAllBtnListner();
      resolve();
    });
    btnGreen.once("press", function fn() {
      removeAllBtnListner();
      resolve();
    });
    btnYellow.once("press", function fn() {
      removeAllBtnListner();
      resolve();
    });
  });
}

/**
 * Create the sequence that the user will have to repeat to win the game
 */
function makeSequence() {
  return new Promise((resolve, reject) => {
    printDebug(`I will create a sequence with ${sequenceLimit} steps`);

    for (let i = 0; i < sequenceLimit; i++) {
      const randomValue = Math.floor(Math.random() * btnLength) + 1;
      printDebug(`${i} -> ${randomValue}`);
      sequence.push(randomValue);
      if (randomValue === 1) {
        printDebug(`Enabled orange`, "red");
        ledsToggle(true, false, false);
      } else if (randomValue === 2) {
        printDebug(`Enabled green`, "green");
        ledsToggle(false, true, false);
      } else if (randomValue === 3) {
        printDebug(`Enabled yellow`, "yellow");
        ledsToggle(false, false, true);
      }
      sleep(speedChosen);
      ledsToggle();
      sleep(1000);
    }

    ledsToggle();

    ledBlue.on();
    printMessage("Repeat the sequence, if you haven't already forgotten it!");
    printDebug(`The new sequence is: ${sequence}`);
    resolve();
  });
}

/**
 * Validate the sequence the user is typing
 * @param {*} button
 */
function validateCombination(button) {
  printMessage("Let's see if you remember well ...");
  printDebug(`validate step: ${sequence[currentIndex]} vs ${button}`);
  let error = false;
  switch (button) {
    case "orange":
      if (sequence[currentIndex] !== 1) {
        // error
        error = true;
      } else {
        // ok
        ledsToggle(true, false, false);
      }
      break;
    case "green":
      if (sequence[currentIndex] !== 2) {
        // error
        error = true;
      } else {
        // ok
        ledsToggle(false, true, false);
      }
      break;
    case "yellow":
      if (sequence[currentIndex] !== 3) {
        // error
        error = true;
      } else {
        // ok
        ledsToggle(false, false, true);
      }
      break;
  }

  sleep(200);
  ledsToggle();

  currentIndex++;
  if (currentIndex === sequenceLimit) {
    if (error === false) {
      success = true;
    }
    sequenceDone = true;
  } else if (!error) {
    printMessage("You remembered well");
  } else {
    printMessage("You have not completed the sequence!");
    sequenceDone = true;
  }

  return sequenceDone;
}

/**
 * Check the sequence the user is typing
 */
function checkUserCombination() {
  return new Promise((resolve, reject) => {
    btnOrange.on("press", function fn() {
      printDebug(`Pressed Orange`);
      if (validateCombination("orange")) {
        removeAllBtnListner();
        resolve();
      }
    });
    btnGreen.on("press", function fn() {
      printDebug(`Pressed Green`);
      if (validateCombination("green")) {
        removeAllBtnListner();
        resolve();
      }
    });
    btnYellow.on("press", function fn() {
      printDebug(`Pressed Yellow`);
      if (validateCombination("yellow")) {
        removeAllBtnListner();
        resolve();
      }
    });
  });
}

/**
 * Show results message
 */
async function showResult() {
  printDebug(`showResult: ${success}`);
  if (success === true) {
    printMessage(
      "\nAnd then they say that luck does not exist, you remembered the whole sequence!\n Do you want to test yourself again?"
    );
    await playSuccess();
  } else {
    printMessage("\nAhahhaa maybe it's better if you try again!");
    await playError();
  }
}

/**
 * Play start song
 */
function playStart() {
  return new Promise((resolve, reject) => {
    const song = "C F C G -- C G A L F -- C F C G";
    const tempo = 100;
    const duration = Math.round(
      ((song.replace(/\s/g, "").length * tempo) / 60) * 100
    );

    // Plays the same song with a string representation
    piezo.play({
      // DO = C  RE = D   MI = E   FA = F   SOL = G  LA = A SI = B
      // song is composed by a string of notes
      // a default beat is set, and the default octave is used
      // any invalid note is read as "no note"
      song,
      beats: 1 / 4,
      tempo
    });

    ledOrange.pulse({
      easing: "linear",
      duration: 3000,
      cuePoints: [0, 0.2, 0.4, 0.6, 0.8, 1],
      keyFrames: [0, 10, 0, 50, 0, 255]
    });

    ledGreen.pulse({
      easing: "linear",
      duration: 3000,
      cuePoints: [0, 0.2, 0.4, 0.6, 0.8, 1],
      keyFrames: [0, 10, 0, 50, 0, 255]
    });

    ledYellow.pulse({
      easing: "linear",
      duration: 3000,
      cuePoints: [0, 0.2, 0.4, 0.6, 0.8, 1],
      keyFrames: [0, 10, 0, 50, 0, 255]
    });

    setTimeout(() => {
      ledOrange.stop();
      ledGreen.stop();
      ledYellow.stop();
      ledsToggle();
      resolve();
    }, duration);
  });
}

/**
 * Play success song
 */
function playSuccess() {
  return new Promise((resolve, reject) => {
    // Plays a song
    piezo.play({
      // song is composed by an array of pairs of notes and beats
      // The first argument is the note (null means "no note")
      // The second argument is the length of time (beat) of the note (or non-note)
      song: [
        ["C4", 1 / 4],
        ["D4", 1 / 4],
        ["F4", 1 / 4],
        ["D4", 1 / 4],
        ["A4", 1 / 4],
        [null, 1 / 4],
        ["A4", 1],
        ["G4", 1],
        [null, 1 / 2],
        ["C4", 1 / 4],
        ["D4", 1 / 4],
        ["F4", 1 / 4],
        ["D4", 1 / 4],
        ["G4", 1 / 4],
        [null, 1 / 4],
        ["G4", 1],
        ["F4", 1],
        [null, 1 / 2]
      ],
      tempo: 100
    });

    // Plays the same song with a string representation
    piezo.play({
      // song is composed by a string of notes
      // a default beat is set, and the default octave is used
      // any invalid note is read as "no note"
      song: "C D F D A - A A A A G G G G - - C D F D G - G G G G F F F F - -",
      beats: 1 / 4,
      tempo: 100
    });

    ledGreen.pulse({
      easing: "linear",
      duration: 3000,
      cuePoints: [0, 0.2, 0.4, 0.6, 0.8, 1],
      keyFrames: [0, 10, 0, 50, 0, 255]
    });

    setTimeout(() => {
      ledGreen.stop();
      ledGreen.off();
      resolve();
    }, 5000);
  });
}

/**
 * Play error song
 */
async function playError() {
  return new Promise((resolve, reject) => {
    // Plays the same song with a string representation
    piezo.play({
      // song is composed by a string of notes
      // a default beat is set, and the default octave is used
      // any invalid note is read as "no note"
      song: "A F C C C C",
      beats: 1 / 4,
      tempo: 100
    });

    ledOrange.pulse({
      easing: "linear",
      duration: 3000,
      cuePoints: [0, 0.2, 0.4, 0.6, 0.8, 1],
      keyFrames: [0, 10, 0, 50, 0, 255]
    });

    setTimeout(() => {
      ledOrange.stop();
      ledOrange.off();
      resolve();
    }, 1000);
  });
}

/**
 * Start the game
 */
async function startGame() {
  resetVars();

  await showGuideMessage();
  await setGameSpeed();
  await userIsReady();
  await makeSequence();
  await checkUserCombination();
  await showResult();
  startGame();
}

/**
 * Reset all before exit to the process
 */
const beforeExit = () => {
  ledsToggle();
  ledBlue.off();
  printDebug("I am sorry that you go out :-(");
};

/**
 * Actions before exit to the process
 */
const processExit = () => {
  beforeExit();
  process.exit(1);
};

// LET'S START
board
  .on("ready", () => {
    printDebug("I'M READY TO GO");
    startGame();
  })
  .on("exit", () => {
    processExit();
  });
