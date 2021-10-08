---
uuid: <% tp.date.now("YYYYMMDDHHmmss") %>
alias: 
dates:
  created: <% tp.file.creation_date("YYYY-MM-DDTHH:mm:ss") %>
  last-modified: <% tp.file.last_modified_date("YYYY-MM-DDTHH:mm:ss") %>
version: 3
---

# <% tp.file.title %>

## 📋 Tasks

- [ ] Establish workout regimen for the week ^92ce16
- [ ] Review calendar for the week
- [ ] Review [[2021-W<%tp.date.now("ww") - 1%>]]
- [ ] Determine what outcomes are relevant for this week
- [ ] Close out ritual
	- [ ] Review health data in [[Apple Health (App)]] ^1e00ff

## 💼 Projects

 ```dataview
TABLE status
FROM #type/project and [[<% tp.date.now("YYYY") %>-W<% tp.date.now("ww") %>]]
```

## 🛣 Upcoming

_What is coming up this week?_

### Netlify
- [ ] 


### Vue Mastery
- [ ] 


### BenCodeZen
- [ ] 


### Miscellaneous
- [ ] 


## 📦 Outcomes

_What output came of this week's effort? In other words, what were the impact of the time and energy spent this week?_

### Netlify
- [ ] 


### Vue Mastery
- [ ] 


### BenCodeZen
- [ ] 


### Miscellaneous
- [ ] 


## 📝 Notes

### ⛰ Obstacles

_What challenges presented themselves this week?_

- 

### 🎒 Lessons Learned

_What would I like to do better next week?_

- 

### 📖 Miscellaneous


## 🗓️ Daily Notes

```dataview
TABLE status as "Status", week
FROM #type/timeline/daily
WHERE week = [[2021-W<%tp.date.now("ww")%>]]
```

---

## 📇 Additional Metadata

**🧰 Attributes**

- 🗓️ Week:: <%tp.date.now("ww")%>

**🏷 Tag(s)**

- 🗂 Type:: #type/timeline/weekly
- 🏁 Status:: #status/in-progress 
