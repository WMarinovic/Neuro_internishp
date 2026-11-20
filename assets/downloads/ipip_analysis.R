# ipip_analysis.R
# Scoring the IPIP Big-Five Factor Markers: Module 6 of "Coding Experiments in PsychoPy".
# Needs data/ (the response files) and ipip50_items.csv beside this script.

library(tidyverse)
SCALE_MAX <- 5

# 1. Join and reverse-score ---------------------------------------------------
files <- list.files("data", pattern = "_IPIP_.*\\.csv$", full.names = TRUE)
resp <- files |>
  set_names() |>
  map(read_csv, show_col_types = FALSE) |>
  list_rbind(names_to = "file")

items <- read_csv("ipip50_items.csv", show_col_types = FALSE) |>
  select(item_no, subscale, reverse)

scored <- resp |>
  left_join(items, by = "item_no") |>
  mutate(scored = if_else(reverse == 1, (SCALE_MAX + 1) - response, response))

# 2. Subscale scores and a profile -------------------------------------------
subscale_scores <- scored |>
  group_by(participant, subscale) |>
  summarise(score = sum(scored), .groups = "drop")

# one row per respondent, one column per subscale
profile <- subscale_scores |>
  pivot_wider(names_from = subscale, values_from = score)

profile

# 3. The group profile --------------------------------------------------------
subscale_scores |>
  group_by(subscale) |>
  summarise(mean_score = mean(score), .groups = "drop") |>
  ggplot(aes(reorder(subscale, mean_score), mean_score)) +
  geom_col(fill = "steelblue") +
  coord_flip() +
  labs(x = NULL, y = "Mean subscale score (10-50)",
       title = "IPIP Big Five profile (group mean)")
