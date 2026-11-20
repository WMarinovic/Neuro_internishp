# asrs_analysis.R
# Scoring the ASRS-v1.1 screener: Module 6 of "Coding Experiments in PsychoPy".
# Needs data/ (the response files) and asrs_items.csv beside this script.
# The ASRS is a screening tool, not a diagnosis.

library(tidyverse)

# 1. Stack the responses and attach the thresholds ---------------------------
files <- list.files("data", pattern = "_ASRS_.*\\.csv$", full.names = TRUE)
resp <- files |>
  set_names() |>
  map(read_csv, show_col_types = FALSE) |>
  list_rbind(names_to = "file")

items <- read_csv("asrs_items.csv", show_col_types = FALSE) |>
  select(item_no, shaded_from)

scored <- resp |>
  left_join(items, by = "item_no") |>
  mutate(shaded = response >= shaded_from)

# 2. The screen, per respondent ----------------------------------------------
summary <- scored |>
  group_by(participant) |>
  summarise(
    shaded_count = sum(shaded),        # 0-6
    point_total  = sum(response),      # 0-24
    .groups = "drop"
  ) |>
  mutate(
    screen_positive = shaded_count >= 4,   # canonical shaded-box rule
    point_positive  = point_total >= 14    # alternative point rule
  )

summary
