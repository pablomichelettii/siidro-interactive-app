// SMARTPHONE — vote-pad anonimo. cid in sessionStorage per sopravvivere a un blip.
const socket = io({ query: { role: "device" } });
const $ = (id) => document.getElementById(id);
let cid = sessionStorage.getItem("cid") || null;
let myVote = null;

function show(id, on) { $(id).classList.toggle("hidden", !on); }

function render(view) {
  const ended = view.phase === "ended";
  const voting = view.phase === "voting" && view.options;
  show("wait", !voting && !ended);
  show("voteBox", voting);
  show("endBox", ended);

  if (voting) {
    $("q").textContent = view.options.q;
    // opzioni NON etichettate facile/difficile (la comoda deve sembrare ragionevole)
    $("opts").innerHTML = view.options.opts.map(o =>
      `<button class="btn vote-opt ${myVote === o.tag ? "picked" : ""}" data-tag="${o.tag}">${o.text}</button>`).join("");
    show("voteNote", !!myVote);
  } else if (!ended) {
    myVote = null;  // nuovo capitolo: reset del voto locale
  }

  if (ended && view.ended) {
    const e = view.ended;
    $("roomName").textContent = e.collective.name;
    $("youName").textContent = e.personal.name;
    $("cmpBridge").textContent = e.diverges ? "Ma con le tue scelte, tu saresti arrivato a" : "E con le tue scelte, come la sala, a";
    $("youCount").textContent = `${e.facili} scelte comode su ${e.totalVotes}`;
    $("youVerdict").textContent = e.verdict;
    $("youFired").innerHTML = e.fired.map(f => `<div class="fired ${f.kind}">${f.txt}</div>`).join("");
  }
}

// voto
document.addEventListener("click", (ev) => {
  const b = ev.target.closest(".vote-opt");
  if (!b) return;
  myVote = b.dataset.tag;
  document.querySelectorAll(".vote-opt").forEach(x => x.classList.toggle("picked", x === b));
  show("voteNote", true);
  socket.emit("device:vote", { option: myVote });
});

socket.on("connect", () => {
  socket.emit("device:join", { cid }, (res) => {
    if (res && res.cid) { cid = res.cid; sessionStorage.setItem("cid", cid); }
    render(res || { phase: "lobby" });
  });
});
socket.on("device:sync", render);
