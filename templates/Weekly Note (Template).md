---
uuid: <% tp.date.now("YYYYMMDDHHmmss") %>
created: <% tp.file.creation_date("YYYY-MM-DDTHH:mm:ss") %>
updated: <% tp.file.last_modified_date("YYYY-MM-DDTHH:mm:ss") %>
alias: 
---

# [[<% tp.file.title %>]]


## 📋 Tasks

- [ ] Review calendar for the week
- [ ] Determine what outcomes are relevant for this week

## 📝 Notes

### ⛰ Obstacles

_What challenges presented themselves this week?_

- 

### 🎒 Lessons Learned

_What would I like to do better next week?_

- 

### 📖 Miscellaneous

- 

## 🗓️ Daily Notes

```dataview
LIST
FROM #type/timeline/daily
WHERE week = [[<%tp.date.now("YYYY")%>-W<%tp.date.now("ww")%>]]
```

---

## 📇 Additional Metadata

- 🗂 Type:: #type/timeline/weekly
- 🗓️ Week:: <% tp.date.now("ww") %>
