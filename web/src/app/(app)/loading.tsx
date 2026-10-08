// 画面を切り替える間に、すぐ出す仮の画面 (押した瞬間に反応する)。中身が届いたら入れ替わる。
export default function Loading() {
  return (
    <div className="rg-grid" aria-busy="true" aria-label="読み込み中">
      <div className="rg-card hero full rg-skel" style={{ height: 210 }} />
      <div className="rg-card rg-skel" style={{ height: 140 }} />
      <div className="rg-card rg-skel" style={{ height: 140 }} />
      <div className="rg-card rg-skel" style={{ height: 120 }} />
    </div>
  )
}
