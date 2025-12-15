# Reddit Content Calendar Algorithm

This project implements an algorithm to automate the creation of a Reddit content calendar for organic marketing.

## Features

*   **Input Configuration**: Define Company Info, Personas, Subreddits, and Topics.
*   **Algorithm**:
    *   Distributes posts across the week.
    *   Selects topics and subreddits in a round-robin fashion to ensure coverage.
    *   Assigns "OP" (Original Poster) personas randomly.
    *   Simulates comments/replies from *other* personas to create natural-looking conversations.
    *   Generates prompts for an LLM (like ChatGPT) to write the actual content.
*   **Calendar View**: Visualizes the plan for the week in a table format.
*   **Export**: Download the generated calendar as a CSV file.
*   **Subsequent Weeks**: Ability to generate calendars for future weeks.

## Getting Started

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Run the development server:
    ```bash
    npm run dev
    ```

3.  Open [http://localhost:3000](http://localhost:3000) with your browser.

## Project Structure

*   `src/lib/algorithm.ts`: The core logic for generating the calendar.
*   `src/types/index.ts`: TypeScript definitions for the data models.
*   `src/components/`: UI components for the form and calendar view.
*   `src/app/page.tsx`: Main application page.

## Algorithm Details

The algorithm (`generateContentCalendar`) takes the inputs and:
1.  Calculates the dates for the upcoming week (or future weeks).
2.  Iterates through the desired number of posts per week.
3.  Selects a topic and subreddit.
4.  Selects a persona to be the OP.
5.  Generates a "prompt" for the post title and body, instructing the LLM to be subtle and natural.
6.  Decides on a number of comments (0-2).
7.  Selects *different* personas to reply to the post, generating prompts for them to agree/disagree constructively.
8.  Returns a sorted list of posts with their associated comment plans.
