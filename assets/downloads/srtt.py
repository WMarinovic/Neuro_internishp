# srtt.py
# Serial reaction time task: Capstone A of "Coding Experiments in PsychoPy".
# Written for PsychoPy Studio 2026.1.x (Python 3.10), run from the Coder.

import os
import random
from psychopy import visual, core, data, gui
from psychopy.hardware import keyboard

# ---------------------------------------------------------------------------
# 1. Settings at the top
# ---------------------------------------------------------------------------
SEQUENCE       = [2, 3, 1, 4, 3, 2, 4, 1, 3, 4, 2, 1]  # positions 1-4
N_BLOCKS       = 7            # total number of blocks
RANDOM_BLOCK   = 6            # this block is random; the rest follow SEQUENCE
REPS_PER_BLOCK = 8            # repeats of the 12-item pattern per block
RESP_KEYS      = ['d', 'f', 'j', 'k']    # keys for positions 1, 2, 3, 4
RSI            = 0.25         # response-to-stimulus interval, seconds
MAX_RT         = 2.0          # response deadline, seconds
POSITIONS_X    = [-0.3, -0.1, 0.1, 0.3]  # x of the four locations (height units)

# ---------------------------------------------------------------------------
# 2. Who is sitting down, and where the data go
# ---------------------------------------------------------------------------
info = {'participant': '', 'session': '001'}
dlg = gui.DlgFromDict(info, title='Serial Reaction Time Task')
if not dlg.OK:
    core.quit()

info['date'] = data.getDateStr()
os.makedirs('data', exist_ok=True)
filename = os.path.join('data', f"{info['participant']}_SRTT_{info['date']}")

thisExp = data.ExperimentHandler(
    name='SRTT',
    extraInfo=info,          # participant, session and date become columns
    dataFileName=filename
)

# ---------------------------------------------------------------------------
# 3. The window, the four circles, the keyboard, and three helpers
# ---------------------------------------------------------------------------
win = visual.Window(size=[1280, 720], fullscr=False, color='black', units='height')
kb = keyboard.Keyboard()

# four circles, always on screen; the target is the one that fills white
circles = [
    visual.Circle(win, radius=0.05, edges=64, lineColor='grey',
                  fillColor=None, lineWidth=3, pos=(x, 0))
    for x in POSITIONS_X
]


def draw_circles():
    for ci in circles:
        ci.draw()


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
# 4. One position list per block
# ---------------------------------------------------------------------------
def make_block_positions(is_random):
    n = len(SEQUENCE) * REPS_PER_BLOCK
    if not is_random:
        return SEQUENCE * REPS_PER_BLOCK
    seq = []
    prev = None
    for _ in range(n):
        choice = random.choice([1, 2, 3, 4])
        while choice == prev:        # no immediate repeats
            choice = random.choice([1, 2, 3, 4])
        seq.append(choice)
        prev = choice
    return seq

# ---------------------------------------------------------------------------
# 5 to 7. Blocks and trials: each trial timed properly, then recorded
# ---------------------------------------------------------------------------
trial_overall = 0   # running count across the whole session

for block in range(1, N_BLOCKS + 1):
    is_random = (block == RANDOM_BLOCK)
    positions = make_block_positions(is_random)

    draw_circles()            # settle the display before the block
    win.flip()
    core.wait(0.5)

    for trial_in_block, pos in enumerate(positions, start=1):
        trial_overall += 1
        correct_key = RESP_KEYS[pos - 1]   # the key matching this position

        # --- a single trial, timed properly ---
        circles[pos - 1].fillColor = 'white'
        draw_circles()
        kb.clearEvents()
        win.flip()
        kb.clock.reset()          # time from the moment the target fills

        response_key = None
        rt = None
        while kb.clock.getTime() < MAX_RT:
            keys = kb.getKeys(keyList=RESP_KEYS + ['escape'], waitRelease=False)
            if keys:
                press = keys[0]
                if press.name == 'escape':
                    quit_cleanly()
                response_key = press.name
                rt = press.rt
                break

        correct = int(response_key == correct_key)
        circles[pos - 1].fillColor = None      # clear the target again

        # response-to-stimulus interval: the circles stay visible as outlines
        draw_circles()
        win.flip()
        core.wait(RSI)

        # --- record the trial ---
        thisExp.addData('block', block)
        thisExp.addData('block_type', 'random' if is_random else 'sequence')
        thisExp.addData('trial_in_block', trial_in_block)
        thisExp.addData('trial_overall', trial_overall)
        thisExp.addData('position', pos)
        thisExp.addData('correct_key', correct_key)
        thisExp.addData('response_key', response_key)
        thisExp.addData('correct', correct)
        thisExp.addData('rt', rt)
        thisExp.addData('rsi', RSI)
        thisExp.nextEntry()

    if block < N_BLOCKS:
        show_message(f"End of block {block} of {N_BLOCKS}. "
                     "Take a short break. Press SPACE to continue.")

show_message("That is the end of the task. Thank you!")
quit_cleanly()
