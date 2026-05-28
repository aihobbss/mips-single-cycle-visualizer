// CPE-315 Single-Cycle Datapath — instruction / control / block data.
// Ground truth: current/CPE-315/exams/midterms/Midterm_Study_Guide.md (Sections 0 + 4d).

const DATAPATH_CPE315 = {
  // ---------------------------------------------------------------------------
  // 13 instructions covered (per Lec 7-9 + Seng's exam scope)
  // ---------------------------------------------------------------------------
  instructions: {
    add: {
      name: "add",
      format: "R",
      encoding: "| op(6)=0 | rs(5) | rt(5) | rd(5) | shamt(5) | funct(6)=32 |",
      syntax: "add $rd, $rs, $rt",
      semantics: "$rd = $rs + $rt",
      controls: { RegDst: 1, RegWrite: 1, ALUSrc: 0, ALUOp: "add", PCSrc: 0,
                  MemRead: 0, MemWrite: 0, MemtoReg: 0, "Branch?": "X" },
      blocks: ["pc4", "im", "rf_read", "alu", "rf_write"],
      muxes:  ["regdst_mux", "alusrc_mux", "memtoreg_mux"],
    },
    sub: {
      name: "sub",
      format: "R",
      encoding: "| op(6)=0 | rs(5) | rt(5) | rd(5) | shamt(5) | funct(6)=34 |",
      syntax: "sub $rd, $rs, $rt",
      semantics: "$rd = $rs - $rt",
      controls: { RegDst: 1, RegWrite: 1, ALUSrc: 0, ALUOp: "sub", PCSrc: 0,
                  MemRead: 0, MemWrite: 0, MemtoReg: 0, "Branch?": "X" },
      blocks: ["pc4", "im", "rf_read", "alu", "rf_write"],
      muxes:  ["regdst_mux", "alusrc_mux", "memtoreg_mux"],
    },
    and: {
      name: "and",
      format: "R",
      encoding: "| op(6)=0 | rs(5) | rt(5) | rd(5) | shamt(5) | funct(6)=36 |",
      syntax: "and $rd, $rs, $rt",
      semantics: "$rd = $rs & $rt  (bitwise AND)",
      controls: { RegDst: 1, RegWrite: 1, ALUSrc: 0, ALUOp: "and", PCSrc: 0,
                  MemRead: 0, MemWrite: 0, MemtoReg: 0, "Branch?": "X" },
      blocks: ["pc4", "im", "rf_read", "alu", "rf_write"],
      muxes:  ["regdst_mux", "alusrc_mux", "memtoreg_mux"],
    },
    or: {
      name: "or",
      format: "R",
      encoding: "| op(6)=0 | rs(5) | rt(5) | rd(5) | shamt(5) | funct(6)=37 |",
      syntax: "or $rd, $rs, $rt",
      semantics: "$rd = $rs | $rt  (bitwise OR)",
      controls: { RegDst: 1, RegWrite: 1, ALUSrc: 0, ALUOp: "or", PCSrc: 0,
                  MemRead: 0, MemWrite: 0, MemtoReg: 0, "Branch?": "X" },
      blocks: ["pc4", "im", "rf_read", "alu", "rf_write"],
      muxes:  ["regdst_mux", "alusrc_mux", "memtoreg_mux"],
    },
    addi: {
      name: "addi",
      format: "I",
      encoding: "| op(6)=8 | rs(5) | rt(5) | imm(16) |",
      syntax: "addi $rt, $rs, imm",
      semantics: "$rt = $rs + SignExtend(imm)",
      controls: { RegDst: 0, RegWrite: 1, ALUSrc: 1, ALUOp: "add", PCSrc: 0,
                  MemRead: 0, MemWrite: 0, MemtoReg: 0, "Branch?": "X" },
      blocks: ["pc4", "im", "rf_read", "sign_ext", "alu", "rf_write"],
      muxes:  ["regdst_mux", "alusrc_mux", "memtoreg_mux"],
    },
    slt: {
      name: "slt",
      format: "R",
      encoding: "| op(6)=0 | rs(5) | rt(5) | rd(5) | shamt(5) | funct(6)=42 |",
      syntax: "slt $rd, $rs, $rt",
      semantics: "$rd = ($rs < $rt) ? 1 : 0",
      controls: { RegDst: 1, RegWrite: 1, ALUSrc: 0, ALUOp: "slt", PCSrc: 0,
                  MemRead: 0, MemWrite: 0, MemtoReg: 0, "Branch?": "X" },
      blocks: ["pc4", "im", "rf_read", "alu", "rf_write"],
      muxes:  ["regdst_mux", "alusrc_mux", "memtoreg_mux"],
    },
    lw: {
      name: "lw",
      format: "I",
      encoding: "| op(6)=35 | rs(5) | rt(5) | imm(16) |",
      syntax: "lw $rt, offset($rs)",
      semantics: "$rt = M[$rs + SignExtend(offset)]",
      controls: { RegDst: 0, RegWrite: 1, ALUSrc: 1, ALUOp: "add", PCSrc: 0,
                  MemRead: 1, MemWrite: 0, MemtoReg: 1, "Branch?": "X" },
      blocks: ["pc4", "im", "rf_read", "sign_ext", "alu", "dm_read", "rf_write"],
      muxes:  ["regdst_mux", "alusrc_mux", "memtoreg_mux"],
    },
    sw: {
      name: "sw",
      format: "I",
      encoding: "| op(6)=43 | rs(5) | rt(5) | imm(16) |",
      syntax: "sw $rt, offset($rs)",
      semantics: "M[$rs + SignExtend(offset)] = $rt",
      controls: { RegDst: "X", RegWrite: 0, ALUSrc: 1, ALUOp: "add", PCSrc: 0,
                  MemRead: 0, MemWrite: 1, MemtoReg: "X", "Branch?": "X" },
      blocks: ["pc4", "im", "rf_read", "sign_ext", "alu", "dm_write"],
      muxes:  ["alusrc_mux"],
    },
    beq: {
      name: "beq",
      format: "I",
      encoding: "| op(6)=4 | rs(5) | rt(5) | imm(16) |",
      syntax: "beq $rs, $rt, label",
      semantics: "if ($rs == $rt) PC = (PC+4) + (SignExtend(imm) << 2)",
      controls: { RegDst: "X", RegWrite: 0, ALUSrc: 0, ALUOp: "sub", PCSrc: 2,
                  MemRead: 0, MemWrite: 0, MemtoReg: "X", "Branch?": "AND" },
      blocks: ["pc4", "im", "rf_read", "sign_ext", "alu", "branch_adder"],
      muxes:  ["alusrc_mux", "pcsrc_mux"],
    },
    bne: {
      name: "bne",
      format: "I",
      encoding: "| op(6)=5 | rs(5) | rt(5) | imm(16) |",
      syntax: "bne $rs, $rt, label",
      semantics: "if ($rs != $rt) PC = (PC+4) + (SignExtend(imm) << 2)",
      // Same datapath as beq; the Branch? logic is NAND'd against zero_flag
      // (taken when zero=0, i.e. operands differ).
      controls: { RegDst: "X", RegWrite: 0, ALUSrc: 0, ALUOp: "sub", PCSrc: 2,
                  MemRead: 0, MemWrite: 0, MemtoReg: "X", "Branch?": "NAND" },
      blocks: ["pc4", "im", "rf_read", "sign_ext", "alu", "branch_adder"],
      muxes:  ["alusrc_mux", "pcsrc_mux"],
    },
    j: {
      name: "j",
      format: "J",
      encoding: "| op(6)=2 |              address(26)              |",
      syntax: "j label",
      semantics: "PC = { PC[31:28], imm26, 2'b00 }",
      controls: { RegDst: "X", RegWrite: 0, ALUSrc: "X", ALUOp: "X", PCSrc: 3,
                  MemRead: 0, MemWrite: 0, MemtoReg: "X", "Branch?": "X" },
      blocks: ["im", "jump_logic"],
      muxes:  ["pcsrc_mux"],
    },
    jal: {
      name: "jal",
      format: "J",
      encoding: "| op(6)=3 |              address(26)              |",
      syntax: "jal label",
      // jal: same jump target as `j`, plus links the return address (PC+4)
      // into $31. RegDst=2 selects the hardcoded $31 as the write reg (a
      // 3-input extension of the RegDst mux beyond rd/rt).
      semantics: "$ra = PC+4 ; PC = { PC[31:28], imm26, 2'b00 }",
      controls: { RegDst: 2, RegWrite: 1, ALUSrc: "X", ALUOp: "X", PCSrc: 3,
                  MemRead: 0, MemWrite: 0, MemtoReg: "X", "Branch?": "X" },
      blocks: ["pc4", "im", "jump_logic", "rf_write"],
      muxes:  ["pcsrc_mux"],
    },
    jr: {
      name: "jr",
      format: "R",
      encoding: "| op(6)=0 | rs(5) | 0(5) | 0(5) | 0(5) | funct(6)=8 |",
      syntax: "jr $rs",
      semantics: "PC = $rs",
      // jr reads $rs from RF then routes RegData1 directly to PC. No ALU/DM/RF write.
      // NOTE: jr does NOT use jump_logic (the Concat + <<2 J-type target path) —
      // it bypasses everything and feeds RF Read1 straight into the PCSrc mux.
      controls: { RegDst: "X", RegWrite: 0, ALUSrc: "X", ALUOp: "X", PCSrc: 1,
                  MemRead: 0, MemWrite: 0, MemtoReg: "X", "Branch?": "X" },
      blocks: ["im", "rf_read"],
      muxes:  ["pcsrc_mux"],
    },
  },

  // ---------------------------------------------------------------------------
  // Control signal metadata (used for table headers + tooltips)
  // ---------------------------------------------------------------------------
  controlSignals: {
    RegDst: {
      description: "RF write address mux: rt (Inst[20-16]) vs rd (Inst[15-11]) vs $31 (jal)",
      values: { 1: "rd (R-type)", 0: "rt (I-type)", 2: "$31 (jal link)", X: "don't care (no RF write)" },
    },
    RegWrite: {
      description: "Register file write enable",
      values: { 1: "writes back to RF", 0: "no RF write" },
    },
    ALUSrc: {
      description: "ALU operand-2 mux: RegData2 vs sign-extended immediate",
      values: { 1: "sign-extended imm", 0: "RegData2", X: "don't care" },
    },
    ALUOp: {
      description: "ALU operation (decoded from op + funct by ALU control)",
      values: {},
    },
    PCSrc: {
      description: "PC mux source: 0=PC+4, 1=$rs (jr), 2=branch target (beq/bne), 3=jump target (j/jal)",
      values: { 0: "PC+4", 1: "$rs (jr)", 2: "branch target", 3: "jump target", X: "don't care" },
    },
    MemRead: {
      description: "Data Memory read enable (only lw)",
      values: { 1: "read DM", 0: "no read" },
    },
    MemWrite: {
      description: "Data Memory write enable (only sw)",
      values: { 1: "write DM", 0: "no write" },
    },
    MemtoReg: {
      description: "RF writeback mux: ALU result vs DM read data (1 only on lw)",
      values: { 1: "DM read data (lw)", 0: "ALU result", X: "don't care (no RF write)" },
    },
    "Branch?": {
      description: "Branch resolution logic gating the zero_flag for PCSrc=2: AND for beq (taken when zero=1), NAND for bne (taken when zero=0)",
      values: { AND: "beq (taken if zero=1)", NAND: "bne (taken if zero=0)", X: "don't care (no branch)" },
    },
  },

  // ---------------------------------------------------------------------------
  // Functional blocks (rows of the component-activation table)
  // alwaysOn = block is on the critical path of EVERY instruction (PC, IM, etc.)
  // ---------------------------------------------------------------------------
  blocks: {
    pc4:          { label: "PC + 4 adder",                          alwaysOn: false },
    im:           { label: "Instruction Memory",                    alwaysOn: true  },
    rf_read:      { label: "Register File (read ports)",            alwaysOn: false },
    sign_ext:     { label: "Sign-Extend (16 → 32)",            alwaysOn: false },
    alu:          { label: "ALU",                                   alwaysOn: false },
    dm_read:      { label: "Data Memory (read)",                    alwaysOn: false },
    dm_write:     { label: "Data Memory (write)",                   alwaysOn: false },
    branch_adder: { label: "Branch adder + <<2 shifter",            alwaysOn: false },
    jump_logic:   { label: "Jump target { PC[31:28], imm26<<2 }",   alwaysOn: false },
    rf_write:     { label: "Register File (write port)",            alwaysOn: false },
  },

  // ---------------------------------------------------------------------------
  // Common pairs Seng has tested or hinted at — quick-select buttons
  // ---------------------------------------------------------------------------
  presets: {
    "lw + add":    ["lw", "add"],
    "lw + sw":     ["lw", "sw"],
    "addi + lw":   ["addi", "lw"],
    "beq + j":     ["beq", "j"],
    "beq + add":   ["beq", "add"],
    "and + or":    ["and", "or"],
    "j + jal":     ["j", "jal"],
    "jal + jr":    ["jal", "jr"],
  },

  // Display order for the picker chips
  instructionOrder: ["add", "sub", "and", "or", "addi", "slt", "lw", "sw", "beq", "bne", "j", "jal", "jr"],

  // Display order for the control-signal table columns
  signalOrder: ["RegDst", "RegWrite", "ALUSrc", "ALUOp", "PCSrc", "MemRead", "MemWrite", "MemtoReg", "Branch?"],

  // Display order for the component-activation table rows
  blockOrder: ["pc4", "im", "rf_read", "sign_ext", "alu", "rf_write", "dm_read", "dm_write", "branch_adder", "jump_logic"],
};
