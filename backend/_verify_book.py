import re
import urllib.request

req = urllib.request.Request(
    "http://localhost:9001/api/v1/ebooks/ebook-886ce9f412e8/html",
    headers={"X-Region-Id": "chuncheon-north"},
)
data = urllib.request.urlopen(req, timeout=60).read().decode("utf-8")

perf = "실적관리"
plan = "사업계획서"
pp, pl = data.find(perf), data.find(plan)
print("perf found:", pp >= 0, "| plan found:", pl >= 0)
print("order 실적관리 < 사업계획서:", (0 <= pp < pl), f"(perf@{pp} plan@{pl})")

labels = re.findall(r'class="roman">([ⅠⅡⅢⅣ])</span>([^<]+)<', data)
print("first entry subsection order:", labels[:4])
print("book:", 'class="book"' in data, "| leaves:", data.count('class="leaf"'),
      "| flip:", "flip-next" in data, "| js:", "getElementsByClassName" in data)
