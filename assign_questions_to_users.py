import json
import random
from collections import defaultdict

def assign_questions_to_users(questions_file, num_users, num_questions_per_user_per_topic=1):
    """
    Assigns a set of random questions from different topics to each user.

    Args:
        questions_file (str): Path to the JSON file containing all questions.
        num_users (int): The number of users to assign questions to.
        num_questions_per_user_per_topic (int): The number of questions
                                                 each user should get from each topic.

    Returns:
        dict: A dictionary where keys are user IDs (e.g., "user_1") and values
              are lists of assigned question dictionaries.
    """
    with open(questions_file, 'r') as f:
        data = json.load(f)
    all_questions = data['questions']

    # Group questions by topic
    questions_by_topic = defaultdict(list)
    for question in all_questions:
        questions_by_topic[question['topic']].append(question)

    assigned_questions = {}
    topics = list(questions_by_topic.keys())

    if not topics:
        print("Error: No topics found in the questions file.")
        return {}

    for i in range(1, num_users + 1):
        user_id = f"user_{i}"
        user_questions = []

        # Ensure each user gets questions from all topics
        for topic in topics:
            available_questions_in_topic = questions_by_topic[topic]

            if len(available_questions_in_topic) < num_questions_per_user_per_topic:
                print(f"Warning: Not enough questions in topic '{topic}' for {num_questions_per_user_per_topic} questions per user.")
                # If not enough, take all available
                selected_questions = available_questions_in_topic
            else:
                # Randomly select questions from the current topic
                selected_questions = random.sample(
                    available_questions_in_topic,
                    num_questions_per_user_per_topic
                )

            for q in selected_questions:
                # Create a copy to avoid modifying the original question object
                # and add the 'code' field as specified in your desired output format
                q_copy = q.copy()
                q_copy['code'] = "" # Placeholder for the code
                user_questions.append(q_copy)

        # Shuffle the assigned questions for the user to mix topics if desired
        random.shuffle(user_questions)
        assigned_questions[user_id] = user_questions

    return assigned_questions

if __name__ == "__main__":
    QUESTIONS_FILE = 'data/questions.json'
    NUM_USERS = 3 # You can change the number of users here
    NUM_QUESTIONS_PER_USER_PER_TOPIC = 1 # Each user gets 1 question from each of the 5 topics, so 5 questions total.

    assigned_data = assign_questions_to_users(
        QUESTIONS_FILE,
        NUM_USERS,
        NUM_QUESTIONS_PER_USER_PER_TOPIC
    )

    output_filename = 'data/assigned_questions.json'
    with open(output_filename, 'w') as f:
        json.dump(assigned_data, f, indent=2)

    print(f"Assigned questions for {NUM_USERS} users saved to '{output_filename}'")