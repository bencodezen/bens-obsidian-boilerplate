---
uuid: <% moment(tp.file.title).format("YYYYMMDDHHmmss") %>
created: <% tp.file.creation_date("YYYY-MM-DDTHH:mm:ss") %>
updated: <% tp.file.last_modified_date("YYYY-MM-DDTHH:mm:ss") %>
alias: 
- "<% moment(tp.file.title).format("MMMM Do, YYYY") %>"
- "<% moment(tp.file.title).format("dddd Do MMMM, YYYY") %>"
---

# [[<% tp.file.title %>|<% moment(tp.file.title).format("MMMM Do, YYYY") %>]]

## 🕰️ Timeline

*A representation of the activities for the day.*

### ✨ Morning

- **07:00AM to 08:00PM**
- **08:00AM to 09:00PM**
- **09:00AM to 10:00PM**
- **10:00AM to 11:00PM**
- **11:00AM to 12:00PM**

### 🌤️ Afternoon

- **12:00PM to 01:00PM**
- **01:00PM to 02:00PM**
- **02:00PM to 03:00PM**
- **03:00PM to 04:00PM**
- **04:00PM to 05:00PM**

### 🌙 Evening
	
- **05:00PM to 06:00PM**
- **06:00PM to 07:00PM**
- **07:00PM to 08:00PM**
- **08:00PM to 09:00PM**
- **09:00PM to 10:00PM**

---

## 📇 Additional Metadata

- 🗓️ Week:: [[<% moment(tp.file.title).format("YYYY-[W]ww") %>]]
- 🗂 Type:: #type/timeline/daily
