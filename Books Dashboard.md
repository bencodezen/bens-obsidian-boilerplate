---
uuid: 20210517113616
alias:
dates:
  created: 2021-05-17T11:36:11
  last-modified: 2021-05-17T11:36:11
---

# (050) Books

## 📖 Currently Reading

```dataview
TABLE genre as "Genre", progress as "%"
FROM #type/refs/book and #status/active
```

## ⚙️ Ready to Process

```dataview
TABLE genre as "Genre"
FROM #type/refs/book and #status/review
```

## 📥 Queue

### Fiction

```dataview
TABLE priority as "Priority", genre as "Genre"
FROM #type/refs/book and #status/queue and #genre/fiction
SORT priority ASC
```

### Non-Fiction

```dataview
TABLE priority as "Priority", genre as "Genre"
FROM #type/refs/book and #status/queue and #genre/non-fiction
SORT priority ASC
```

## ❄️ Backlog

```dataview
LIST
FROM #type/refs/book and #status/backlog
```

## ✅ Recently Read

```dataview
LIST
FROM #type/refs/book and #status/archive
```

## 🗄️ Archive

```dataview
LIST
FROM #type/refs/book and #status/archive
```

---

## Additional Metadata

**🏷 Tags**

- 🗂 Type:: #type/dashboard
- 🧠 Mode::
- 🧊 EDM::
- 🎭 Genre::
- 🌎 Area::
- 🙌 Team::
- 🏁 Status::
- 🛰 Platform::
- 💬 Topic(s)::

**🖇️ Related Links**

- 👤 Creator(s)::
- 👍 Recommended By::
- ✨ Inspired By:
- 🔮 Origin::
- 🚀 POD::
- 🔗 Location::
