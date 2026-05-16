(function() {
  var addBtn = document.getElementById("addBtn");
  var itemList = document.getElementById("itemList");
  var emptyState = document.getElementById("emptyState");
  var formError = document.getElementById("formError");
  var countBadge = document.getElementById("countBadge");

  function showError(msg) {
    formError.textContent = msg;
    formError.style.display = "block";
    setTimeout(function() { formError.style.display = "none"; }, 3000);
  }

  function escHtml(str) {
    var d = document.createElement("div");
    d.textContent = str || "";
    return d.innerHTML;
  }

  function renderItems(entries) {
    countBadge.textContent = entries.length;
    if (!entries || entries.length === 0) {
      itemList.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }
    emptyState.style.display = "none";
    itemList.innerHTML = entries.map(function(item) {
      return '<div class="item-card" data-id="' + item.id + '">' +
        '<div class="item-info"><h3>' + escHtml(item.title) + '</h3>' +
        (item.status ? '<p>Status: ' + escHtml(item.status) + '</p>' : '') +
        '</div><button class="btn-delete" data-id="' + item.id + '" title="Delete">Delete</button></div>';
    }).join("");
    itemList.querySelectorAll(".btn-delete").forEach(function(btn) {
      btn.addEventListener("click", function() { deleteItem(btn.dataset.id); });
    });
  }

  function loadItems() {
    fetch("/api/entries")
      .then(function(r) { return r.json(); })
      .then(function(data) { if (data.success) renderItems(data.entries); })
      .catch(function() { renderItems([]); });
  }

  function deleteItem(id) {
    fetch("/api/entries/" + id, { method: "DELETE" })
      .then(function(r) { return r.json(); })
      .then(function(data) { if (data.success) loadItems(); })
      .catch(function(e) { console.error("Delete failed:", e); });
  }

  addBtn.addEventListener("click", function() {
    var titleInput = document.getElementById("field_title");
    var statusInput = document.getElementById("field_status");
    var title = titleInput.value.trim();
    if (!title) {
      showError("Entry title is required");
      titleInput.focus();
      return;
    }
    addBtn.disabled = true;
    fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title, status: statusInput.value.trim() })
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.success) {
          titleInput.value = "";
          statusInput.value = "active";
          loadItems();
        } else {
          showError(data.message || "Failed to add");
        }
      })
      .catch(function() { showError("Network error"); })
      .finally(function() { addBtn.disabled = false; });
  });

  document.getElementById("field_title").addEventListener("keydown", function(e) {
    if (e.key === "Enter") addBtn.click();
  });

  loadItems();
})();
