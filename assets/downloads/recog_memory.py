# recog_memory.py
# Recognition memory task: Capstone B of "Coding Experiments in PsychoPy".
# Written for PsychoPy Studio 2026.1.x (Python 3.10), run from the Coder.
# Needs memory_words.csv (one column headed "word") in the same folder.

import os
import random
from psychopy import visual, core, data, gui
from psychopy.hardware import keyboard

# ---------------------------------------------------------------------------
# 1. Settings
# ---------------------------------------------------------------------------
STIM_FILE  = 'memory_words.csv'
N_STUDY    = 20          # number of studied (old) words
N_LURES    = 20          # number of unstudied (new) words at test
STUDY_DUR  = 1.5         # seconds each word is shown during study
STUDY_ISI  = 0.6         # blank gap between study words
ITI        = 0.5         # blank gap between test trials
KEY_OLD    = 'o'         # "I saw this word"
KEY_NEW    = 'n'         # "this word is new"

# ---------------------------------------------------------------------------
# 2. Participant details and the data file
# ---------------------------------------------------------------------------
info = {'participant': '', 'session': '001'}
dlg = gui.DlgFromDict(info, title='Recognition Memory Task')
if not dlg.OK:
    core.quit()

info['date'] = data.getDateStr()
os.makedirs('data', exist_ok=True)
filename = os.path.join('data', f"{info['participant']}_RECOG_{info['date']}")

thisExp = data.ExperimentHandler(
    name='RECOG',
    extraInfo=info,          # participant, session and date become columns
    dataFileName=filename
)

# ---------------------------------------------------------------------------
# 3. Window, stimuli, keyboard and helpers
# ---------------------------------------------------------------------------
win = visual.Window(size=[1280, 720], fullscr=False, color='black', units='height')
kb = keyboard.Keyboard()

word_stim = visual.TextStim(win, text='', color='white', height=0.08)
prompt = visual.TextStim(win, text=f"{KEY_OLD.upper()} = old      {KEY_NEW.upper()} = new",
                         color='grey', height=0.04, pos=(0, -0.3))


def quit_cleanly():
    thisExp.close()          # write whatever has been collected
    win.close()
    core.quit()


def show_message(text):
    msg = visual.TextStim(win, text=text, color="white",
                          height=0.045, wrapWidth=0.9)
    msg.draw()
    win.flip()
    keys = kb.getKeys(keyList=["space", "escape"], waitRelease=False)
    while not keys:
        keys = kb.getKeys(keyList=["space", "escape"], waitRelease=False)
    if keys[0].name == "escape":
        quit_cleanly()


def wait_with_quit(duration):
    timer = core.Clock()
    while timer.getTime() < duration:
        if kb.getKeys(keyList=["escape"], waitRelease=False):
            quit_cleanly()

# ---------------------------------------------------------------------------
# 4. Split the pool into old and new
# ---------------------------------------------------------------------------
pool = [row['word'] for row in data.importConditions(STIM_FILE)]
random.shuffle(pool)
targets = pool[:N_STUDY]                       # studied (old)
lures = pool[N_STUDY:N_STUDY + N_LURES]        # test-only (new)

study_list = targets[:]
random.shuffle(study_list)

test_list = ([{'word': w, 'status': 'old'} for w in targets] +
             [{'word': w, 'status': 'new'} for w in lures])
random.shuffle(test_list)

# ---------------------------------------------------------------------------
# 5. Study phase
# ---------------------------------------------------------------------------
show_message("You will see a series of words, one at a time. "
             "Try to remember them.\n\nPress SPACE to begin.")

for word in study_list:
    word_stim.text = word
    word_stim.draw()
    win.flip()
    wait_with_quit(STUDY_DUR)
    win.flip()                 # blank
    wait_with_quit(STUDY_ISI)

# ---------------------------------------------------------------------------
# 6. Test phase: one trial per test word, recorded as it goes
# ---------------------------------------------------------------------------
show_message(f"Now you will see more words. Some you studied, some are new.\n\n"
             f"Press {KEY_OLD.upper()} if you saw the word before, "
             f"{KEY_NEW.upper()} if it is new.\n\nPress SPACE to begin.")

for trial, entry in enumerate(test_list, start=1):
    word_stim.text = entry['word']
    word_stim.draw()
    prompt.draw()
    kb.clearEvents()
    win.flip()
    kb.clock.reset()               # time the decision from word onset

    response = None
    rt = None
    while response is None:
        keys = kb.getKeys(keyList=[KEY_OLD, KEY_NEW, 'escape'], waitRelease=False)
        if keys:
            press = keys[0]
            if press.name == 'escape':
                quit_cleanly()
            response = 'old' if press.name == KEY_OLD else 'new'
            rt = press.rt

    correct = int(response == entry['status'])

    thisExp.addData('trial', trial)
    thisExp.addData('word', entry['word'])
    thisExp.addData('status', entry['status'])      # old (target) or new (lure)
    thisExp.addData('response', response)           # old or new
    thisExp.addData('correct', correct)
    thisExp.addData('rt', rt)
    thisExp.nextEntry()

    win.flip()                     # blank between test trials
    wait_with_quit(ITI)

show_message("That is the end of the task. Thank you!")
quit_cleanly()
