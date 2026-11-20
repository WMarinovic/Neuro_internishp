# asrs_questionnaire.py
# The six-question ASRS-v1.1 screener: Module 6 of "Coding Experiments in PsychoPy".
# Written for PsychoPy Studio 2026.1.x (Python 3.10), run from the Coder.
#
# Needs asrs_items.csv in the same folder, with columns item_no, shaded_from and item_text.
# The item wording is not distributed with this script: the ASRS-v1.1 Screener is
# (c) New York University and Ronald C. Kessler, PhD, all rights reserved. Your supervisor
# provides the items file; keep that attribution on anything you distribute.
# The ASRS is a screening tool, not a diagnosis.

import os
from psychopy import visual, core, data, gui
from psychopy.hardware import keyboard

# --- the response scale, in one place --------------------------------------
ITEMS_FILE  = 'asrs_items.csv'
RESP_LABELS = ['Never', 'Rarely', 'Sometimes', 'Often', 'Very Often']  # 0..4

# --- participant details and the data file ---------------------------------
info = {'participant': '', 'session': '001'}
dlg = gui.DlgFromDict(info, title='ASRS Screener')
if not dlg.OK:
    core.quit()

info['date'] = data.getDateStr()
os.makedirs('data', exist_ok=True)
filename = os.path.join('data', f"{info['participant']}_ASRS_{info['date']}")
thisExp = data.ExperimentHandler(name='ASRS', extraInfo=info, dataFileName=filename)

# --- window, stimuli, keyboard ---------------------------------------------
win = visual.Window(size=[1280, 720], fullscr=False, color='black', units='height')
win.mouseVisible = True
kb = keyboard.Keyboard()

item_text = visual.TextStim(win, text='', color='white', height=0.04,
                            wrapWidth=1.1, pos=(0, 0.12))
prompt = visual.TextStim(win, text='Click an answer, then press SPACE to go on.',
                         color='grey', height=0.028, pos=(0, -0.35))
slider = visual.Slider(win, ticks=[0, 1, 2, 3, 4], labels=RESP_LABELS,
                       granularity=1, style='radio', size=(0.9, 0.06),
                       pos=(0, -0.18), color='white', labelHeight=0.03)


def quit_cleanly():
    thisExp.close()          # write whatever has been collected
    win.close()
    core.quit()


def show_message(text):
    msg = visual.TextStim(win, text=text, color="white", height=0.045, wrapWidth=0.9)
    msg.draw()
    win.flip()
    keys = kb.getKeys(keyList=["space", "escape"], waitRelease=False)
    while not keys:
        keys = kb.getKeys(keyList=["space", "escape"], waitRelease=False)
    if keys[0].name == "escape":
        quit_cleanly()

# --- the items live in a file ----------------------------------------------
items = data.importConditions(ITEMS_FILE)   # a list of dicts, one per item

show_message("For each statement, choose how often it has applied to you "
             "over the past six months.\n\nPress SPACE to begin.")

# --- one item at a time ----------------------------------------------------
for item in items:
    item_text.text = f"{item['item_no']}. {item['item_text']}"
    slider.reset()
    kb.clearEvents()

    responded = False
    while not responded:
        item_text.draw()
        slider.draw()
        prompt.draw()
        win.flip()
        keys = kb.getKeys(keyList=['space', 'escape'], waitRelease=False)
        if keys:
            if 'escape' in [k.name for k in keys]:
                quit_cleanly()
            if slider.getRating() is not None:   # only advance once answered
                responded = True

    # a radio Slider is categorical: getRating() returns the LABEL text
    rating_label = slider.getRating()
    response = RESP_LABELS.index(rating_label)   # map back to its 0-4 code

    thisExp.addData('item_no', item['item_no'])
    thisExp.addData('response', response)
    thisExp.addData('response_label', rating_label)
    thisExp.addData('rt', slider.getRT())
    thisExp.nextEntry()

show_message("That is the end of the questionnaire. Thank you!")
quit_cleanly()
