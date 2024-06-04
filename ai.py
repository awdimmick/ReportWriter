from openai import OpenAI
import os, time, json

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))

assistant_id = "asst_iq1GaSvMl4e7oGRJCILNU4fj"

def show_json(obj):
    print(json.loads(obj.model_dump_json()))

def rewrite_report(report_text, student_name):
    thread = client.beta.threads.create()
    message = client.beta.threads.messages.create(
        thread_id=thread.id,
        role="user",
        content=report_text
    )
    run = client.beta.threads.runs.create(
        thread_id=thread.id,
        assistant_id=assistant_id
    )

    while run.status == "queued" or run.status == "in_progress":
        print(" - Checking for completed thread")
        run = client.beta.threads.runs.retrieve(
            thread_id=thread.id,
            run_id=run.id
        )
        time.sleep(0.5)
    print("Thread completed.")

    messages = client.beta.threads.messages.list(thread_id=thread.id)
    show_json(messages)
    ai_report = json.loads(messages.model_dump_json())['data'][0]['content'][0]['text']['value']
    return ai_report.replace("STUDENTNAMEREDACTED", student_name)

if __name__ == "__main__":
    report_text = """
Jeff achieved a result of 62.3% in his end-of-year exam, compared to an average of 45.8% across all of his end-of-topic tests throughout the year. Jeff has clearly made significant strides throughout the year and he is determined to do his best in this subject. Jeff's strengths currently his declarative ("theory") knowledge and his understanding of computer systems, data representations and databases in particular. 

Programming continues to be the most challenging aspect of the course for Jeff, achieving 48.5% of marks for the practical programming tasks within his end of year exam. This will improve as Jeff completes his NEA coursework which necessarily involves a significant amount of programming and challenging himself to complete some larger programming projects over the summer (for example, following a tutorial to make a game in Python, or to build a dynamic database-drive website, or a neural network) would help him prepare for this.

With the majority of course content now covered, Jeff's immediate focus for the start of Year 13 will be continuing his NEA coursework, which is due by the end of Autumn Half Term. This is a fixed deadline and it is important that Jeff manages his time well between now and then (including over the summer holidays) to enable him to meet this deadline so that he is able to move on to studying the remaining A Level content along with the rest of his peers.

    """
    print(rewrite_report(report_text, "Jeff"))
