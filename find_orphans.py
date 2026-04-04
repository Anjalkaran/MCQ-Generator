import json
import re

def extract_ids(file_path, prefix):
    ids = set()
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        data = json.loads(content)
        for doc in data.get('documents', []):
            name = doc.get('name', '')
            match = re.search(f"{prefix}/([^/]+)$", name)
            if match:
                ids.add(match.group(1))
    return ids

def extract_topic_ids_from_mcqs(file_path):
    topic_ids = {}
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        data = json.loads(content)
        for doc in data.get('documents', []):
            fields = doc.get('fields', {})
            topic_id = fields.get('topicId', {}).get('stringValue')
            if topic_id:
                topic_ids[doc['name']] = topic_id
    return topic_ids

# Paths from previous tool outputs
topics_file = r'C:\Users\shanm\.gemini\antigravity\brain\4bb27a87-4435-4e7f-867e-14ff47e37b61\.system_generated\steps\440\output.txt'
mcqs_file = r'C:\Users\shanm\.gemini\antigravity\brain\4bb27a87-4435-4e7f-867e-14ff47e37b61\.system_generated\steps\452\output.txt'

existing_topic_ids = extract_ids(topics_file, 'topics')
mcq_docs_with_topic_ids = extract_topic_ids_from_mcqs(mcqs_file)

orphans = []
for mcq_name, topic_id in mcq_docs_with_topic_ids.items():
    if topic_id not in existing_topic_ids:
        orphans.append({"name": mcq_name, "topicId": topic_id})

print(f"Total existing topics: {len(existing_topic_ids)}")
print(f"Total MCQs listed: {len(mcq_docs_with_topic_ids)}")
print(f"Found {len(orphans)} orphan MCQ documents (topicId missing from topics collection):")
for orphan in orphans:
    print(f"MCQ Document: {orphan['name']} -> Missing TopicId: {orphan['topicId']}")
