const display = document.querySelector('.alarm-display');
const log = document.querySelector('.alarm-log');
const form = document.querySelector('.create-alarm');
const clearButton = document.getElementById('clear-display');
const clearCurrent = document.getElementById('stop-current-alarm');
const refreshButton = document.getElementById('refresh-display');

// DOM event bindings

// Alarm display buttons

clearButton.addEventListener('click', () => manager.cancelAllAlarms());
clearCurrent.addEventListener('click', () => manager.clearCurrentAlarm());
refreshButton.addEventListener('click', () => manager.refreshDisplay());

// New alarm form

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);

  // Extract form values
  const name = data['alarm-name'];
  const delay = Number.parseFloat(data['time-value']);
  const delayFormat = data['time-format'];
  const period = Number.parseFloat(data['period']);

  // Prepare alarm info for creation call
  const alarmInfo = {};

  if (delayFormat === 'ms') {
    // Specified in milliseconds, use `when` property
    alarmInfo.when = Date.now() + delay;
  } else if (delayFormat === 'min') {
    // specified in minutes, use `delayInMinutes` property
    alarmInfo.delayInMinutes = delay;
  }

  if (period) {
    alarmInfo.periodInMinutes = period;
  }

  // Create the alarm – this uses the same signature as chrome.alarms.create
  manager.createAlarm(name, alarmInfo);
});

class AlarmManager {
  constructor(display, log) {
    this.displayElement = display;
    this.logElement = log;

    this.logMessage('Manager: initializing demo');

    this.alarmSound = new Audio("./Alarm-Fast-High-Pitch-A3-Ring-Tone-www.fesliyanstudios.com.mp3");

    this.displayElement.addEventListener('click', this.handleCancelAlarm);
    chrome.alarms.onAlarm.addListener(this.handleAlarm);
  }

  logMessage(message) {
    const date = new Date();
    const pad = (val, len = 2) => val.toString().padStart(len, '0');
    const h = pad(date.getHours());
    const m = pad(date.getMinutes());
    const s = pad(date.getSeconds());
    const ms = pad(date.getMilliseconds(), 3);
    const time = `${h}:${m}:${s}.${ms}`;

    const logLine = document.createElement('div');
    logLine.textContent = `[${time}] ${message}`;

    this.logElement.insertBefore(logLine, this.logElement.firstChild);
  }

  handleAlarm = async (alarm) => {
    const json = JSON.stringify(alarm);
    this.logMessage(`Alarm "${alarm.name}" fired\n${json}}`);
    this.alarmSound.play();
    await this.refreshDisplay();
  };

  handleCancelAlarm = async (event) => {
    if (!event.target.classList.contains('alarm-row__cancel-button')) {
      return;
    }

    const name = event.target.parentElement.dataset.name;
    await this.cancelAlarm(name);
    await this.refreshDisplay();
  };

  async cancelAlarm(name) {
    return chrome.alarms.clear(name, (wasCleared) => {
      if (wasCleared) {
        this.logMessage(`Manager: canceled alarm "${name}"`);
      } else {
        this.logMessage(`Manager: could not cancel alarm "${name}"`);
      }
    });
  }

  createAlarm(name, alarmInfo) {
    chrome.alarms.create(name, alarmInfo);
    const json = JSON.stringify(alarmInfo, null, 2).replace(/\s+/g, ' ');
    this.logMessage(`Created "${name}"\n${json}`);
    this.refreshDisplay();
  }

  renderAlarm(alarm, isLast) {
    const alarmEl = document.createElement('div');
    alarmEl.classList.add('alarm-row');
    alarmEl.dataset.name = alarm.name;
    alarmEl.textContent = JSON.stringify(alarm, 0, 2) + (isLast ? '' : ',');

    const cancelButton = document.createElement('button');
    cancelButton.classList.add('alarm-row__cancel-button');
    cancelButton.textContent = 'cancel';
    alarmEl.appendChild(cancelButton);

    this.displayElement.appendChild(alarmEl);
  }

  async cancelAllAlarms() {
    this.alarmSound.pause();
    return chrome.alarms.clearAll((wasCleared) => {
      if (wasCleared) {
        this.logMessage(`Manager: canceled all alarms"`);
      } else {
        this.logMessage(`Manager: could not canceled all alarms`);
      }
    });
  }

  async populateDisplay() {
    return chrome.alarms.getAll((alarms) => {
      for (const [index, alarm] of alarms.entries()) {
        const isLast = index === alarms.length - 1;
        this.renderAlarm(alarm, isLast);
      }
    });
  }

  #refreshing = false;

  async refreshDisplay() {
    if (this.#refreshing) {
      return;
    }

    this.#refreshing = true;
    try {
      await this.clearDisplay();
      await this.populateDisplay();
    } finally {
      this.#refreshing = false;
    }
  }

  async clearDisplay() {
    this.displayElement.textContent = '';
  }
}

const manager = new AlarmManager(display, log);
manager.refreshDisplay();