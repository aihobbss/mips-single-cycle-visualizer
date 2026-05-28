# CPE-315 Datapath — Wire Reference (which instructions light each wire)

Plain-English guide to every conceptual wire in the single-cycle datapath SVG,
and exactly which of the 13 instructions should light it. Use this while tagging
`data-uses` in `cpe315-datapath-layout.svg`.

Ground truth: `cpe315-datapath-data.js` controls + Midterm_Study_Guide Section 4d.

13 instructions: add, sub, and, or, addi, slt, lw, sw, beq, bne, j, jal, jr

---

## The 4 governing rules (memorize these — they fix most mistags)

1. **and / or wire EXACTLY like add / sub.** All four are R-type ALU ops. If a wire
   has `add,sub` it must also have `and,or`. (Only the ALUOp value differs.)
2. **jal = j on the jump path, PLUS a register write.** Every jump-path wire that
   has `j` must also have `jal`. jal additionally lights the link/writeback wires.
3. **beq = bne everywhere.** Identical wiring; the control unit just inverts the
   zero-flag test.
4. **jr is alone:** reads $rs → routes straight to PC. No ALU, no jump-logic blocks,
   no writeback.

Shorthand groups used below:
- **R-ALU** = add, sub, and, or, slt   (the 5 register-to-register ALU ops)
- **I-ALU** = addi, lw, sw              (use sign-extended immediate as ALU operand 2)
- **BR**    = beq, bne
- **JUMP**  = j, jal

---

## Always on (all 13 instructions)

| Wire (plain English) | SVG id | Instructions |
|---|---|---|
| PC → Instruction Memory (fetch) | path1 | all 13 |
| PCSrc mux output → PC (write next PC) | path42 | all 13 |
| IM → instruction-bit split point | path5, path7 | all 13 |
| op/funct field → Control Unit (decode) | path14 | all 13 |

---

## PC + 4 logic

| Wire | SVG id | Instructions | Why |
|---|---|---|---|
| PC → +4 adder | path2 | R-ALU, I-ALU, BR | computes PC+4 (the fall-through address) |
| PC+4 → PCSrc input 0 (default next instr) | path3 | R-ALU + addi, lw, sw | the 8 non-control-flow ops always fall through here. BR use it only when *not* taken — we light their branch path instead. JUMP override PC entirely. |
| PC+4 → branch adder (1st operand) | path4 | beq, bne | branch target = (PC+4) + (imm<<2) |
| PC+4 → R[31] link (write into $ra) | path-jal-link | jal | jal saves PC+4 as the return address |

---

## Register read

| Wire | SVG id | Instructions | Why |
|---|---|---|---|
| rs[25-21] → RF Read1 address | path9 | R-ALU + addi, lw, sw, beq, bne, jr | everything that reads $rs. NOT j, jal. |
| rt[20-16] → RF Read2 address | path10 | R-ALU + sw, beq, bne | reads $rt as a *source*. NOT addi/lw (rt is their destination), not JUMP/jr. |
| RF Read1 (ReadData1) → ALU input A | path28 | R-ALU + addi, lw, sw, beq, bne | $rs feeds the ALU. jr reads $rs but routes to PC (see jr path), not the ALU. |
| RF Read2 (ReadData2) → ALUSrc mux input 0 (register operand) | path29 | R-ALU + beq, bne | ALU operand 2 is a register here (ALUSrc=0). |
| RF Read2 → Data Memory "Write Data" port | path30 | sw | the value being stored. |

---

## Immediate / Sign-Extend

| Wire | SVG id | Instructions | Why |
|---|---|---|---|
| imm[15-0] → Sign-Extend input | path13 (+ routing segs 13-9, 13-6, 13-6-3, 13-6-3-4) | addi, lw, sw, beq, bne | every instruction with a 16-bit immediate |
| Sign-Extend → ALUSrc mux input 1 (immediate operand) | path21 (lower), path22 | addi, lw, sw | ALU operand 2 is the immediate (ALUSrc=1). NOT beq/bne — their immediate goes to the branch shifter, not the ALU. |
| Sign-Extend → Shift<<2 (branch) → branch adder | path21 (upper riser), path1-8, path24 | beq, bne | builds the branch displacement |

---

## ALU

| Wire | SVG id | Instructions | Why |
|---|---|---|---|
| ALUSrc mux output → ALU input B | path31 | R-ALU + addi, lw, sw, beq, bne | every ALU user (all 10 non-jump-non-jr) |
| ALU result → ALU output bus | path32 | R-ALU + addi, lw, sw | the result *value* is used downstream. BR use only the zero flag, not the value. |
| ALU result → Data Memory "Addr" port | path32-4 | lw, sw | only memory ops use the ALU result as an address |
| ALU result → MemtoReg mux input 0 (ALU-result writeback) | path34 | R-ALU + addi | these write the ALU result back. NOT lw (writes DM data instead), not sw/BR (no writeback). |
| ALU zero flag → AND gate | path37 | beq, bne | drives the taken-branch decision |

---

## Data Memory

| Wire | SVG id | Instructions | Why |
|---|---|---|---|
| DM read data → MemtoReg mux input 1 | path35 | lw | only lw writes memory data back to a register |
| RF Read2 → DM Write Data | path30 | sw | (same wire as register-read section) |

---

## Writeback (into Register File)

| Wire | SVG id | Instructions | Why |
|---|---|---|---|
| MemtoReg mux output → RF "Write Data" port | path36 | R-ALU + addi, lw | the 7 instructions that write a data value. (jal writes PC+4 to $ra, but the simplified diagram doesn't route that through this mux.) |
| rd[15-11] → RegDst mux input 1 (R-type write target) | path11 | R-ALU | R-types write to $rd |
| rt[20-16] → RegDst mux input 0 (I-type write target) | path7-9 | addi, lw | these write to $rt |
| RegDst mux output → RF "Write Reg" port | path20 | R-ALU + addi, lw, jal | every instruction that writes a register. jal goes through the path even though its write reg is hardwired to $31. |

---

## Branch resolution

| Wire | SVG id | Instructions |
|---|---|---|
| Branch control signal → AND gate | path38 | beq, bne |
| AND gate output → PCSrc select (taken branch) | path39, path31-2-3-61 | beq, bne |
| Branch adder output → branch target → PCSrc input | path40, path40-2, path1-3 | beq, bne |

---

## Jump path (J-type)

**Rule 2: every wire here is `j,jal` — not `j` alone.**

| Wire | SVG id | Instructions |
|---|---|---|
| addr[25-0] tap → Shift<<2 (jump) | text14 (label), tap wire | j, jal |
| Shift<<2 (jump) block → Concat | b-shl2-jump, path25-7* | j, jal |
| PC[31:28] tap → Concat | path26, text26 (label) | j, jal |
| Concat block → PCSrc input (jump target) | b-concat | j, jal |

\* path25-7's comment says "Shift<<2(jump)→Concat" but it's currently tagged with
the 10 non-jump instructions and sits at y≈136 (branch-adder height, not the
jump-block height ≈y380). **Verify this one in Debug** before retagging — the comment
may be stale or the wire may actually belong to the branch path.

---

## jr path

**Rule 4: jr is alone.**

| Wire | SVG id | Instructions |
|---|---|---|
| RF Read1 → PCSrc input (jump-register target) | path41 | jr |

jr does NOT light: any jump-logic block (Concat/<<2), the ALU, sign-extend, or any
writeback wire. It reads $rs (so it shares rs[25-21]→Read1, path9) and routes that
value to PC.

---

## Control-signal labels (blue text)

| Label | SVG id | Instructions |
|---|---|---|
| RegWrite | text75 | R-ALU + addi, lw, jal  *(already correct)* |
| ALUSrc | text76 | R-ALU + addi, lw, sw, beq, bne (all ALU users) — or, if you want it to light only when ALUSrc=1, just addi, lw, sw. Pick one and be consistent. |
| ALUOp | text81 | R-ALU + addi, lw, sw, beq, bne (all ALU users) |
| Branch? | text80 | beq, bne |
| MemRead | text77 | lw |
| MemWrite | text78 | sw |
| MemtoReg | text79 | lw |

---

## Per-instruction quick check (what should light, end to end)

- **add / sub / and / or / slt** (R-ALU): rs→Read1, rt→Read2, both → ALU,
  ALU result → MemtoReg(0) → WrData, rd → RegDst(1) → WrReg, RegWrite. Only ALUOp differs.
- **addi**: rs→Read1, imm→SignExt→ALUSrc(imm)→ALU B, ALU result→MemtoReg(0)→WrData,
  rt→RegDst(0)→WrReg, RegWrite. (Reads rs only, not rt.)
- **lw**: rs→Read1, imm→SignExt→ALUSrc(imm)→ALU B, ALU result→DM Addr,
  DM data→MemtoReg(1)→WrData, rt→RegDst(0)→WrReg, RegWrite, MemRead.
- **sw**: rs→Read1, rt→Read2→DM Write Data, imm→SignExt→ALUSrc(imm)→ALU B,
  ALU result→DM Addr, MemWrite. No writeback.
- **beq / bne**: rs→Read1, rt→Read2→ALUSrc(reg)→ALU B, ALU subtracts→zero→AND gate,
  imm→SignExt→<<2→branch adder (+PC+4)→branch target→PCSrc, Branch signal→AND.
  No DM, no writeback.
- **j**: addr[25-0]→<<2→Concat, PC[31:28]→Concat→jump target→PCSrc. Nothing else.
- **jal**: everything j lights, PLUS PC+4→$31 link, RegDst→WrReg, RegWrite. No ALU, no DM, no register read.
- **jr**: rs→Read1→PCSrc (bypass). Nothing else.

---

## Current mistags found in the SVG (high-confidence fix list)

All of these are the "missing and,or / missing jal" pattern. Verify the id in Debug,
then set the tag to the value below.

| id | current `data-uses` | should be |
|---|---|---|
| path9 (rs→Read1) | add,sub,addi,slt,lw,sw,beq,bne,jr | add,sub,and,or,slt,addi,lw,sw,beq,bne,jr |
| path10 (rt→Read2) | add,sub,slt,sw,beq,bne | add,sub,and,or,slt,sw,beq,bne |
| path28 (Read1→ALU A) | add,sub,addi,slt,lw,sw,beq,bne | add,sub,and,or,slt,addi,lw,sw,beq,bne |
| path29 (Read2→ALUSrc) | add,sub,slt,beq,bne | add,sub,and,or,slt,beq,bne |
| path31 (ALUSrc→ALU B) | add,sub,addi,slt,lw,sw,beq,bne | add,sub,and,or,slt,addi,lw,sw,beq,bne |
| path32 (ALU result bus) | add,sub,addi,slt,lw,sw | add,sub,and,or,slt,addi,lw,sw |
| path32-4 (ALU→DM Addr) | add,sub,addi,lw,sw | lw,sw |
| path34 (ALU→MemtoReg 0) | add,sub,addi,slt | add,sub,and,or,slt,addi |
| path36 (MemtoReg→WrData) | add,sub,addi,slt,lw | add,sub,and,or,slt,addi,lw |
| path11 (rd→RegDst 1) | add,sub,slt | add,sub,and,or,slt |
| path20 (RegDst→WrReg) | add,sub,addi,slt,lw | add,sub,and,or,slt,addi,lw,jal |
| text81 (ALUOp label) | add,sub,addi,slt,lw,sw,beq,bne | add,sub,and,or,slt,addi,lw,sw,beq,bne |
| text76 (ALUSrc label) | add,sub,addi,slt,lw,sw | add,sub,and,or,slt,addi,lw,sw,beq,bne |
| jump path (text14, b-shl2-jump, b-concat, path26, text26) | j | j,jal |
| path25-7 | add,sub,and,or,addi,slt,lw,sw,beq,bne | VERIFY in Debug first (see jump-path note) |
