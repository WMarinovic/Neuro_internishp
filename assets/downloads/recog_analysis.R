# recog_analysis.R
# Analysis for Capstone B of "Coding Experiments in PsychoPy".
# Set the working directory to the folder that contains data/
# (Session > Set Working Directory > To Source File Location), then run.

library(tidyverse)

# 1. Counting hits and false alarms ------------------------------------------
files <- list.files("data", pattern = "_RECOG_.*\\.csv$", full.names = TRUE)
dat <- files |>
  set_names() |>
  map(read_csv, show_col_types = FALSE) |>
  list_rbind(names_to = "file")

counts <- dat |>
  filter(!is.na(response)) |>
  mutate(said_old = response == "old") |>
  group_by(participant) |>
  summarise(
    n_old = sum(status == "old"),
    n_new = sum(status == "new"),
    hits  = sum(status == "old" & said_old),
    fa    = sum(status == "new" & said_old),
    .groups = "drop"
  )

# 2. Rates, d-prime and criterion --------------------------------------------
sdt <- counts |>
  mutate(
    hit_rate  = (hits + 0.5) / (n_old + 1),
    fa_rate   = (fa   + 0.5) / (n_new + 1),
    d_prime   = qnorm(hit_rate) - qnorm(fa_rate),
    criterion = -0.5 * (qnorm(hit_rate) + qnorm(fa_rate)),
    accuracy  = (hits + (n_new - fa)) / (n_old + n_new)
  )

sdt

# 3. Seeing it ----------------------------------------------------------------
ggplot(sdt, aes(fa_rate, hit_rate)) +
  geom_abline(slope = 1, intercept = 0, linetype = "dashed", colour = "grey60") +
  geom_point(size = 3, colour = "steelblue") +
  coord_equal(xlim = c(0, 1), ylim = c(0, 1)) +
  labs(x = "False-alarm rate", y = "Hit rate",
       title = "Recognition memory: hits vs false alarms")
