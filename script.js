
function saveReview() {
  const input = document.getElementById("review-input").value;
  if (input.trim() === "") return;
  const reviews = JSON.parse(localStorage.getItem("reviews") || "[]");
  reviews.push(input);
  localStorage.setItem("reviews", JSON.stringify(reviews));
  document.getElementById("review-input").value = "";
  loadReviews();
}

function loadReviews() {
  const reviews = JSON.parse(localStorage.getItem("reviews") || "[]");
  const container = document.getElementById("review-list");
  container.innerHTML = reviews.map(r => `<p>${r}</p>`).join("");
}

function saveDiary() {
  const input = document.getElementById("diary-input").value;
  if (input.trim() === "") return;
  const diaries = JSON.parse(localStorage.getItem("diaries") || "[]");
  diaries.push({ date: new Date().toLocaleDateString(), text: input });
  localStorage.setItem("diaries", JSON.stringify(diaries));
  document.getElementById("diary-input").value = "";
  loadDiaries();
}

function loadDiaries() {
  const diaries = JSON.parse(localStorage.getItem("diaries") || "[]");
  const container = document.getElementById("diary-list");
  container.innerHTML = diaries
    .map(d => `<p><b>${d.date}</b>: ${d.text}</p>`)
    .join("");
}

// 페이지 로드시 자동 불러오기
window.onload = () => {
  loadReviews();
  loadDiaries();
  document.getElementById("weather").textContent = "오늘은 맑음 ☀️";
};
