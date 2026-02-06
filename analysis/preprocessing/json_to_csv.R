# set up ----
library(tidyverse)
library(here)
library(jsonlite)

here::i_am("analysis/preprocessing/json_to_csv.R")
dir_data <- here("data", "testing")
dir_results <- here("results", "testing")

# 1. Read in raw jsons ----
# get list of all json files
file_list <- list.files(path = dir_data, pattern = "\\.json$", full.names = TRUE)

# some of the columns are different var. types across files, so let's make them all characters
read_df <- function(filepath) {
  df <- jsonlite::fromJSON(filepath, flatten = TRUE) %>%
    as_tibble()
  return(df)}

# run the function on all files and combine them into one dataframe
df_all_raw <- map_dfr(file_list, read_df, .id = "source_file")

# unify old-format (sessionID, game_settings.*) and new-format (subjectID, condition)
if ("sessionID" %in% names(df_all_raw) & "subjectID" %in% names(df_all_raw)) {
  df_all_raw <- df_all_raw %>%
    mutate(subjectID = coalesce(subjectID, sessionID))
}
if ("game_settings.session_info.condition" %in% names(df_all_raw) & "condition" %in% names(df_all_raw)) {
  df_all_raw <- df_all_raw %>%
    mutate(condition = coalesce(condition, `game_settings.session_info.condition`))
}

## Count comprehension performance ----
df_attention_check <- df_all_raw %>%
  filter(study_phase == "comprehension") %>%
  count(subjectID, comprehension_passed) %>%
  pivot_wider(
    names_from = comprehension_passed,
    values_from = n,
    values_fill = 0,
    names_prefix = "passed_"
  )
df_attention_check %>% count(passed_TRUE)
# generate included participant list
participants_passed_comp =
  df_attention_check %>%
  filter(passed_TRUE = TRUE) %>%
  pull(subjectID)

# 2. Build dataframes ----

## df_participants ----
df_participants <- df_all_raw %>%
  # keep only riddles data from those who passed comprehension
  filter(subjectID %in% participants_passed_comp,
         study_phase == c("comprehension"),
         trial_type != "instructions") %>%
  # select and rename relevant columns
  select(subjectID, condition) %>%
  # remove duplicates
  distinct() %>%
  # rename columns
  rename(
    subject = subjectID
  )

df_participants_exit <- df_all_raw %>%
  # keep only riddles data from those who passed comprehension
  filter(subjectID %in% participants_passed_comp,
         study_phase =="exit survey",
         trial_type=="survey") %>%
  select(subjectID, response) %>%
  unnest_wider(response)

## df_trials ----
df_trials <- df_all_raw %>%
  # 1. keep rows that are part of 'riddles' phase
  filter(study_phase == 'riddles') %>%
  distinct(subjectID, trial_index, item_type, .keep_all = TRUE) %>%
  # 2. make wide format
  group_by(subjectID, riddle_label) %>%
  mutate(trial_index = min(trial_index)) %>%
  # now fill the correct_answer and condition info
  fill(riddle_cat, condition, .direction = "downup") %>%
  ungroup() %>%
  # then pivot wider
  pivot_wider(
    id_cols = c(subjectID, condition,
                trial_index, riddle_cat, riddle_label),
    names_from = item_type,
    values_from = c(response, rt)
  ) %>%
  # 3. compute trial numbers, 0-indexed
  arrange(subjectID, trial_index) %>%
  mutate(trial_number = row_number()-1,
         block_number = trial_number %/% 3,
         .by = "subjectID") %>%
  mutate(trial_number_within_block = row_number() - 1,
         .by=c("subjectID", "block_number")) %>%
  # 4. select & rename final columns
  select(
    subject = subjectID,
    condition,
    trial_number,
    block_number,
    trial_number_within_block,
    riddle_cat,
    riddle_label,
    response_text = response_response,
    rt_response,
    confidence = response_confidence_rating,
    rt_confidence = rt_confidence_rating,
    similarity = response_similarity_rating,
    rt_similarity = rt_similarity_rating
  ) %>%
  # convert columns to their correct data type
  mutate(
    confidence = as.numeric(confidence),
    subject = as.factor(subject),
    condition = as.factor(condition),
    response_text = str_squish(as.character(response_text)),
    similarity = as.character(similarity),
    riddle_label = as.factor(riddle_label),
    across(starts_with("rt_"), ~ .x / 1000)) %>% # from milliseconds
  # mutate(log_rt = log(rt))
  mutate(similarity = case_when(similarity == "My answer is the same or similar" ~ "similar",
                                similarity == "My answer is different" ~ "different",
                                similarity == "I didn't respond / I didn't know" ~ "no_answer"))

head(df_participants)
head(df_trials)

## EXPORT
write_csv(df_participants, here(dir_results, "df_participants.csv"))
write_csv(df_trials, here(dir_results, "df_trials.csv"))
