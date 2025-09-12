# Feature Specification: Eco-Route MVP - 輸送経路比較システム

**Feature Branch**: `001-handoff-md-mvp`  
**Created**: 2025-09-12  
**Status**: Draft  
**Input**: User description: "handoff.mdを参照し、MVP実現に向けて必要なタスクを分解してほしい"

## Execution Flow (main)
```
1. Parse user description from Input
   → Extract MVP requirements from handoff.md
2. Extract key concepts from description
   → Identified: shippers (actors), route comparison (action), transport metrics (data), weight/priority constraints
3. For each unclear aspect:
   → No major clarifications needed (handoff.md is comprehensive)
4. Fill User Scenarios & Testing section
   → Clear user flow: input origin/destination → get route comparison → view recommendation
5. Generate Functional Requirements
   → Each requirement is testable and measurable
6. Identify Key Entities
   → Transport plans, locations, modes, calculation parameters
7. Run Review Checklist
   → No implementation details in spec
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
物流担当者として、貨物の輸送において、トラック単独輸送とトラック+内航船の組み合わせ輸送を、時間・コスト・CO2排出量の観点から比較し、自社の優先度に応じた最適な輸送方法を選択したい。

### Acceptance Scenarios
1. **Given** 東京から大阪への500kgの貨物輸送が必要な状況で、**When** 時間を最優先（重み0.7）に設定して比較を実行すると、**Then** トラック単独輸送が推奨され、その根拠となる各指標値が表示される

2. **Given** 同じ東京-大阪間の輸送で、**When** CO2削減を最優先（重み0.7）に設定して比較を実行すると、**Then** トラック+内航船の組み合わせが推奨され、CO2削減量が明示される

3. **Given** 任意の出発地と到着地を入力し、**When** バランス型の重み付け（時間0.5、コスト0.3、CO2 0.2）で比較すると、**Then** 両プランの詳細な内訳と総合スコアに基づく推奨案が表示される

### Edge Cases
- 港間ルートが存在しない地域ペアの場合、トラック直行のみが表示される
- 重み付けの合計が1.0にならない場合、正規化されて計算される
- 貨物重量が0または負の値の場合、エラーメッセージが表示される

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: システムは出発地と到着地の地名を受け付け、輸送経路を検索できなければならない
- **FR-002**: システムは貨物重量（kg単位）を入力として受け付けなければならない
- **FR-003**: システムは時間・コスト・CO2の重み付け（0.0〜1.0の数値）を受け付けなければならない
- **FR-004**: システムはトラック単独輸送の時間（時間）、コスト（円）、CO2排出量（kg）を計算し表示しなければならない
- **FR-005**: システムはトラック+内航船組み合わせ輸送の時間、コスト、CO2排出量を計算し表示しなければならない
- **FR-006**: システムは各輸送プランの詳細な経路情報（区間ごとの距離、輸送モード）を表示しなければならない
- **FR-007**: システムは重み付けに基づいてスコアを計算し、最適な輸送プランを推奨しなければならない
- **FR-008**: システムは推奨理由を含む根拠データ（距離、採用リンク等）を表示しなければならない
- **FR-009**: システムは最低3つの標準的な輸送ケースで一貫した計算結果を返さなければならない
- **FR-010**: ユーザーはブラウザから入力フォームを通じて比較条件を入力できなければならない
- **FR-011**: システムは比較結果を表形式で分かりやすく表示しなければならない

### Key Entities *(include if feature involves data)*
- **輸送プラン（Transport Plan）**: 輸送方法の選択肢を表す。truck または truck+ship の識別子、総時間、総コスト、総CO2排出量を持つ
- **地点（Location）**: 都市または港を表す。名称、緯度経度、種別（city/port）を持つ
- **輸送モード（Transport Mode）**: トラックまたは船舶の輸送手段。キロあたりコスト、トンキロあたりCO2排出係数、平均速度を持つ
- **輸送区間（Transport Leg）**: ある地点から別の地点への移動。出発地、到着地、輸送モード、距離、所要時間を持つ
- **港間リンク（Port Link）**: 港と港を結ぶ船舶輸送経路。出発港、到着港、距離、所要時間を持つ
- **比較リクエスト（Comparison Request）**: ユーザーからの比較要求。出発地、到着地、貨物重量、重み付けパラメータを持つ
- **比較結果（Comparison Result）**: 複数の輸送プラン、推奨プラン、根拠データを含む比較の出力

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous  
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (none found)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---