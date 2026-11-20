# ipip_questionnaire.py
# The 50-item IPIP Big-Five Factor Markers: Module 6 of "Coding Experiments in PsychoPy".
# Written for PsychoPy Studio 2026.1.x (Python 3.10), run from the Coder.
#
# Needs ipip50_items.csv in the same folder (item_no, subscale, reverse, item_text).
# The IPIP items are in the public domain (ipip.ori.org). Scales from
# Goldberg, L. R. (1992). The development of markers for the Big-Five factor structure.
# Psychological Assessment, 4, 26-42.

import os
from psychopy import visual, core, data, gui
from psychopy.hardware import keyboard

# --- settings ---------------------------------------------------------------
ITEMS_FILE = 'ipip50_items.csv'
SCALE_MIN, SCALE_MAX = 1, 5      # 5-point accuracy scale

# --- participant details and the data file ---------------------------------
info = {'participant': '', 'session': '001'}
dlg = gui.DlgFromDict(info, title='IPIP Big Five')
if not dlg.OK:
    core.quit()

info['date'] = data.getDateStr()
os.makedirs('data', exist_ok=True)
filename = os.path.join('data', f"{info['participant']}_IPIP_{info['date']}")
thisExp = data.ExperimentHandler(name='IPIP', extraInfo=info, dataFileName=filename)

# --- window, stimuli, keyboard ---------------------------------------------
win = visual.Window(size=[1280, 720], fullscr=False, color='black', units='height')
win.mouseVisible = True
kb = keyboard.Keyboard()

progress = visual.TextStim(win, text='', color='grey', height=0.025, pos=(0, 0.38))
item_text = visual.TextStim(win, text='', color='white', height=0.045,
                            wrapWidth=1.1, pos=(0, 0.1))
prompt = visual.TextStim(win, text='Click an answer, then press SPACE to go on.',
                         color='grey', height=0.028, pos=(0, -0.35))

slider = visual.Slider(win, ticks=list(range(SCALE_MIN, SCALE_MAX + 1)),
                       labels=[str(n) for n in range(SCALE_MIN, SCALE_MAX + 1)],
                       granularity=1, style='radio', size=(1.0, 0.06),
                       pos=(0, -0.12), color='white', labelHeight=0.03)
anchor_lo = visual.TextStim(win, text='Very Inaccurate', color='grey',
                            height=0.028, pos=(-0.5, -0.21))
anchor_hi = visual.TextStim(win, text='Very Accurate', color='grey',
                            height=0.028, pos=(0.5, -0.21))


def quit_cleanly():
    thisExp.close()          # write whatever has been collected
    win.close()
    core.quit()


def show_message(text):
    msg = visual.TextStim(win, text=text, color="white", height=0.04, wrapWidth=1.1)
    msg.draw()
    win.flip()
    keys = kb.getKeys(keyList=["space", "escape"], waitRelease=False)
    while not keys:
        keys = kb.getKeys(keyList=["space", "escape"], waitRelease=False)
    if keys[0].name == "escape":
        quit_cleanly()

# --- the items -------------------------------------------------------------
items = data.importConditions(ITEMS_FILE)

show_message("Describe yourself as you generally are now, not as you wish to be in the future. "
             "Describe yourself as you honestly see yourself, in relation to other people you know "
             "of the same sex as you are, and roughly your same age.\n\n"
             "For each statement, choose from 1 (Very Inaccurate) to 5 (Very Accurate).\n\n"
             "Press SPACE to begin.")

# --- the item loop, with a progress counter --------------------------------
for i, item in enumerate(items, start=1):
    progress.text = f"Item {i} of {len(items)}"
    item_text.text = item['item_text']
    slider.reset()
    kb.clearEvents()

    responded = False
    while not responded:
        progress.draw(); item_text.draw(); slider.draw()
        anchor_lo.draw(); anchor_hi.draw(); prompt.draw()
        win.flip()
        keys = kb.getKeys(keyList=['space', 'escape'], waitRelease=False)
        if keys:
            if 'escape' in [k.name for k in keys]:
                quit_cleanly()
            if slider.getRating() is not None:
                responded = True

    response = int(slider.getRating())

    thisExp.addData('item_no', item['item_no'])
    thisExp.addData('response', response)
    thisExp.addData('rt', slider.getRT())
    thisExp.nextEntry()

show_message("That is the end of the questionnaire. Thank you!")
quit_cleanly()
