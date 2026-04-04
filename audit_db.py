import json
import re
import os

def get_topic_ids(file_path):
    ids = set()
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for doc in data.get('documents', []):
                name = doc.get('name', '')
                match = re.search(r'topics/([^/]+)$', name)
                if match:
                    ids.add(match.group(1))
    except Exception as e:
        print(f"Error reading topics file {file_path}: {e}")
    return ids

def process_topic_mcqs(file_paths, id_to_docs):
    total_docs = 0
    for file_path in file_paths:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                docs = data.get('documents', [])
                total_docs += len(docs)
                for doc in docs:
                    doc_name = doc.get('name', '')
                    fields = doc.get('fields', {})
                    topic_id = fields.get('topicId', {}).get('stringValue')
                    if topic_id:
                        if topic_id not in id_to_docs:
                            id_to_docs[topic_id] = set()
                        id_to_docs[topic_id].add(doc_name)
        except Exception as e:
            print(f"Error reading topicMCQs file {file_path}: {e}")
    return total_docs

def process_question_bank(file_paths, id_to_docs):
    total_docs = 0
    total_questions = 0
    for file_path in file_paths:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                docs = data.get('documents', [])
                total_docs += len(docs)
                for doc in docs:
                    doc_name = doc.get('name', '')
                    fields = doc.get('fields', {})
                    content_str = fields.get('content', {}).get('stringValue', '')
                    if content_str:
                        try:
                            content = json.loads(content_str)
                            questions = content.get('questions', [])
                            total_questions += len(questions)
                            for q in questions:
                                topic_id = q.get('topicId')
                                if topic_id:
                                    if topic_id not in id_to_docs:
                                        id_to_docs[topic_id] = set()
                                    id_to_docs[topic_id].add(doc_name)
                        except:
                            pass # Skip malformed content
        except Exception as e:
            print(f"Error reading questionBank file {file_path}: {e}")
    return total_docs, total_questions

# Paths
topics_file = r'C:\Users\shanm\.gemini\antigravity\brain\4bb27a87-4435-4e7f-867e-14ff47e37b61\.system_generated\steps\495\output.txt'
topic_mcq_files = [
    r'C:\Users\shanm\.gemini\antigravity\brain\4bb27a87-4435-4e7f-867e-14ff47e37b61\.system_generated\steps\503\output.txt',
    r'C:\Users\shanm\.gemini\antigravity\brain\4bb27a87-4435-4e7f-867e-14ff47e37b61\.system_generated\steps\536\output.txt',
    r'C:\Users\shanm\.gemini\antigravity\brain\4bb27a87-4435-4e7f-867e-14ff47e37b61\.system_generated\steps\545\output.txt',
    r'C:\Users\shanm\.gemini\antigravity\brain\4bb27a87-4435-4e7f-867e-14ff47e37b61\.system_generated\steps\551\output.txt',
    r'C:\Users\shanm\.gemini\antigravity\brain\4bb27a87-4435-4e7f-867e-14ff47e37b61\.system_generated\steps\557\output.txt',
    r'C:\Users\shanm\.gemini\antigravity\brain\4bb27a87-4435-4e7f-867e-14ff47e37b61\.system_generated\steps\572\output.txt'
]
question_bank_files = [
    r'C:\Users\shanm\.gemini\antigravity\brain\4bb27a87-4435-4e7f-867e-14ff47e37b61\.system_generated\steps\599\output.txt',
    r'C:\Users\shanm\.gemini\antigravity\brain\4bb27a87-4435-4e7f-867e-14ff47e37b61\.system_generated\steps\605\output.txt',
    r'C:\Users\shanm\.gemini\antigravity\brain\4bb27a87-4435-4e7f-867e-14ff47e37b61\.system_generated\steps\611\output.txt'
]

topic_ids = get_topic_ids(topics_file)
id_to_docs = {}

tm_count = process_topic_mcqs(topic_mcq_files, id_to_docs)
qb_doc_count, qb_q_count = process_question_bank(question_bank_files, id_to_docs)

mcq_topic_ids = set(id_to_docs.keys())
orphans = mcq_topic_ids - topic_ids

print("--- Data Summary ---")
print(f"Total Topics in 'topics' collection: {len(topic_ids)}")
print(f"Total Docs in 'topicMCQs': {tm_count}")
print(f"Total Docs in 'questionBank': {qb_doc_count}")
print(f"Total Individual Questions in 'questionBank': {qb_q_count}")
print(f"Unique TopicIDs found across all MCQs: {len(mcq_topic_ids)}")
print(f"Orphaned TopicIDs (NOT in 'topics' collection): {len(orphans)}")

if orphans:
    print("\n--- Orphaned Topic IDs and their source docs ---")
    for o in sorted(list(orphans)):
        print(f"TopicID: {o}")
        for doc in sorted(list(id_to_docs[o])):
             print(f"  - {doc}")
else:
    print("\nIntegrity Check Passed: All MCQs belong to existing topics.")

missing_mcqs = topic_ids - mcq_topic_ids
print(f"\nTopics with NO MCQs (missing from all collections): {len(missing_mcqs)}")
if missing_mcqs:
    print("These topics exist in the 'topics' collection but have no associated MCQs.")
