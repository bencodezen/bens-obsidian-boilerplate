---
uuid: <% moment(tp.file.title).format("YYYYMMDDHHmmss") %>
alias: 
- "<% moment(tp.file.title).format("MMMM Do, YYYY") %>"
- "<% moment(tp.file.title).format("dddd Do MMMM, YYYY") %>"
dates:
  created: <% tp.file.creation_date("YYYY-MM-DDTHH:mm:ss") %>
  last-modified: <% tp.file.last_modified_date("YYYY-MM-DDTHH:mm:ss") %>
---

# <% moment(tp.file.title).format("MMMM Do, YYYY") %>

<% tp.web.daily_quote() %>

## 🕰️ Timeline

*A representation of the activities for the day.*

### ✨ Morning (0/300)

- **07:00AM to 08:00PM**
- **08:00AM to 09:00PM**
- **09:00AM to 10:00PM**
- **10:00AM to 11:00PM**
- **11:00AM to 12:00PM**

### 🌤️ Afternoon (0/300)

- **12:00PM to 01:00PM**
- **01:00PM to 02:00PM**
- **02:00PM to 03:00PM**
- **03:00PM to 04:00PM**
- **04:00PM to 05:00PM**

### 🌙 Evening (0/300)
	
- **05:00PM to 06:00PM**
- **06:00PM to 07:00PM**
- **07:00PM to 08:00PM**
- **08:00PM to 09:00PM**
- **09:00PM to 10:00PM**

## ✅ Action Items

### 🎯 Priority

*What is the one thing I want to do for me?*

- [ ] 

<%* if (moment(tp.file.title).format("dddd") !== "Saturday" && moment(tp.file.title).format("dddd") !== "Sunday") { -%>

<% tp.file.include("[[Weekly Priority Prompts — Section Template]]") %>

<%* } -%>

### 📋 Todos

- [ ] 🧘 #i/practiced/meditation (10)
- [ ] 👨‍💻 #i/practiced/coding (30)
- [ ] 🎸 #i/practiced/ukulele (10)
- [ ] 🇯🇵 #i/practiced/japanese (10)
- [ ] 📝 #i/practiced/writing (30)
- [ ] 🧼 #i/practiced/cleaning (30)
- [ ] 🐦 #i/practiced/social-media (30)

---

## 🌮 Miscellaneous

**🧰 Attributes**

- 🗓️ Week:: [[<% moment(tp.file.title).format("YYYY-[W]ww") %>]]
- ⏰ Start Time:: <% tp.file.creation_date("HH:mm") %>
- 🛌 End Time:: 

**🏷 Tag(s)**

- 🗂 Type:: #type/timeline/daily
- 🏁 Status:: #status/in-progress 
