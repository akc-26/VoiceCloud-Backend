const emojis=['👏','💜','🔥','😂','✨'];
export function RoomReactionBar({onReact,disabled=false}:{onReact:(emoji:string)=>void;disabled?:boolean}){return <div className="vc-room-reactions" aria-label="Room reactions">{emojis.map(emoji=><button type="button" disabled={disabled} key={emoji} onClick={()=>onReact(emoji)} aria-label={`React ${emoji}`}>{emoji}</button>)}</div>}
