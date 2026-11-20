# srtt_analysis.R
# Analysis for Capstone A of "Coding Experiments in PsychoPy".
# Set the working directory to the folder that contains data/
# (Session > Set Working Directory > To Source File Location), then run.

library(tidyverse)

# 1. Stack and clean ---------------------------------------------------------
files <- list.files("data", pattern = "_SRTT_.*\\.csv$", full.names = TRUE)

dat <- files |>
  set_names() |>
  map(read_csv, show_col_types = FALSE) |>
  list_rbind(names_to = "file")

clean <- dat |>
  filter(correct == 1, !is.na(rt), rt > 0.10, rt < 2.0)

# 2. The learning curve ------------------------------------------------------
by_block <- clean |>
  group_by(participant, block, block_type) |>
  summarise(mean_rt = mean(rt), n = n(), .groups = "drop")

ggplot(by_block, aes(block, mean_rt)) +
  geom_line(aes(group = participant), alpha = 0.30) +
  stat_summary(aes(group = 1), fun = mean, geom = "line", linewidth = 1.2) +
  geom_point(data = filter(by_block, block_type == "random"),
             colour = "red", size = 2) +
  labs(x = "Block", y = "Mean correct RT (s)",
       title = "Serial RT: learning across blocks")

# 3. The sequence cost -------------------------------------------------------
probe      <- unique(dat$block[dat$block_type == "random"])
neighbours <- c(probe - 1, probe + 1)

cost <- by_block |>
  filter(block %in% c(probe, neighbours)) |>
  mutate(kind = if_else(block == probe, "random", "sequence")) |>
  group_by(participant, kind) |>
  summarise(mean_rt = mean(mean_rt), .groups = "drop") |>
  pivot_wider(names_from = kind, values_from = mean_rt) |>
  mutate(sequence_cost = random - sequence)

cost
