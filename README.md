# Coding Experiments in PsychoPy

A hands-on introduction to scripting behavioural experiments in Python with PsychoPy, and to analysing the data they produce in R. Written for research interns in the Discipline of Psychology, Curtin University.

**Live site:** https://wmarinovic.github.io/REPO-NAME/

Written for PsychoPy Studio 2026.1.x on Python 3.10, and for R 4.6.x with RStudio.

## What is here

| Path | What it is |
|---|---|
| `index.html` | Home page: the reaction time demo, how to use the site, and the module map |
| `module-0.html` | Module 0, Getting set up (installing PsychoPy, R and RStudio) |
| `module-1.html` | Module 1, Your first Python script (starting with the Python you need, runnable in the browser) |
| `module-2.html` | Module 2, From one screen to a whole trial |
| `module-3.html` | Module 3, Your first R script (with R running in the browser) |
| `module-4.html` | Module 4, Capstone A: a serial reaction time task |
| `module-5.html` | Module 5, Capstone B: a recognition memory task |
| `module-6.html` | Module 6, Questionnaires and rating data (the ASRS screener and the IPIP-50) |
| `troubleshooting.html` | Searchable troubleshooting Q&A |
| `where-next.html` | Books, courses and guides for going further |
| `demos-r.html` | A forwarding page: the demos now live in their modules |
| `assets/style.css` | All styles, including light and dark themes |
| `assets/site.js` | Shared behaviour: code-block styling, the operating-system switch, checklists, the home page demo |
| `assets/thumbs.js` | The small module drawings used on the home page and in module banners |
| `assets/coder-demos.js` | Modules 1 and 2 demos: draw and flip, clock timing, the ExperimentHandler |
| `assets/demos.js` | The R analysis demos (the pipe, stacking files, learning curves, signal detection, reverse scoring) |
| `assets/rcell.js` | Runnable R cells, using webR 0.6.0 loaded from webr.r-wasm.org |
| `assets/pycell.js` | Runnable Python cells for Module 1, using Pyodide 0.29.5 loaded from cdn.jsdelivr.net |
| `assets/ts.js` | The troubleshooting search |
| `assets/srtt-task.js`, `assets/recog-task.js` | Browser versions of the two capstone tasks, which save the same CSV columns as the PsychoPy scripts |
| `assets/data/` | Simulated example data the R cells read (`srtt/`, `recog/`, `asrs/`, `ipip/`), each with an `index.json` listing its files |
| `assets/downloads/` | The complete scripts, item files, the word pool and zipped example data offered on Modules 4 to 6 |
| `assets/img/` | Screenshots of PsychoPy and RStudio used in Module 0 |

The module pages are written as plain HTML. All example data are simulated; to add a dataset for an R cell, put the CSV files in a folder under `assets/data/`, list their names in that folder's `index.json`, and point the cell's `data-files` attribute at it. An entry written as `{"src": "file.csv", "dest": "file.csv"}` is placed beside `data/` rather than inside it, which is how the questionnaire items files reach R.

## Previewing and editing

There is no build step. Open `index.html` in a browser to preview, and push to the `main` branch to publish through GitHub Pages.

A few conventions in the HTML:

- **Code blocks** are written as `<pre class="code" data-lang="Python" data-file="check.py">`. The script adds the filename tab and line numbers. `data-lang` can be `Python`, `R` or `Shell`.
- **Operating-system text** carries `data-os="windows"`, `data-os="mac"` or `data-os="linux"` (or several, separated by spaces). Anything without `data-os` shows for everyone.
- **Keyboard shortcuts** use `<kbd><span class="mod">Ctrl</span>+Enter</kbd>`; the script shows Cmd on macOS.
- **Boxes** are `<div class="box try">`, `box watch`, `box forr` (For R users) or `box note`. Answers inside a Try this box go in `<details class="reveal">`.
- Teaching code has **no copy button** on purpose, so interns type it themselves.

The pages load three things from outside the repository: the Atkinson Hyperlegible and JetBrains Mono fonts from Google Fonts, Prism 1.29.0 from cdnjs for syntax highlighting, webR (R compiled for the browser) from webr.r-wasm.org and Pyodide (Python compiled for the browser) from cdn.jsdelivr.net. webR and Pyodide are fetched only when someone presses Run. Without a connection the pages still work, with system fonts, plain code and no runnable R or Python.

Checklist ticks and the chosen operating system are kept in each visitor's own browser (local storage). Sessions played in the browser tasks stay in the browser unless the visitor downloads them. Nothing is sent anywhere.

## Licence

The text of this site is licensed under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International licence](https://creativecommons.org/licenses/by-nc-sa/4.0/) (CC BY-NC-SA 4.0); the full legal text is in `LICENSE`.

The screenshots in `assets/img/` show the interfaces of PsychoPy and RStudio, which belong to their respective developers.

The IPIP items in `assets/downloads/ipip50_items.csv` are in the public domain (International Personality Item Pool, ipip.ori.org; Goldberg, 1992). The ASRS-v1.1 Screener is © New York University and Ronald C. Kessler, PhD, all rights reserved; its item wording is deliberately not included in this repository, and `asrs_items.csv` carries placeholder text.

## Use of generative AI

Claude (Anthropic) helped with implementing this website and with checking the text for consistency of language. The choice of content and its accuracy remain the author's responsibility.
