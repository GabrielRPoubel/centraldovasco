document.querySelectorAll(".tab").forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("show"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("show");
  };
});
