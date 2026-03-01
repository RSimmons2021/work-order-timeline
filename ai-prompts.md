# AI Prompts Used During Development

## Design Token Extraction

**Goal:** Extract exact colors, fonts, and dimensions from the Sketch file.

**Approach:** Parsed the Sketch file's JSON (document.json and page JSON) programmatically using Python to extract:
- All color values (converted from 0-1 RGBA to hex)
- Font families and sizes from text style attributes
- Component dimensions from layer frames
- Border radiuses, shadows, and spacing values

**Key findings:**
- Primary color: `#3e40db` (used for active text, links)
- Accent: `#5659ff` (used for today indicator)
- Text dark: `#030929`
- Text secondary: `#687196`
- All text uses `CircularStd` font family at 13-20px sizes
- Status badge colors: Complete `#08a268` on `#e1ffcc`, Blocked `#b13600` on `#fff5cf`, In Progress `#3e40db` on `#edeeff`


## Overlap Detection

**Prompt:** "Efficient algorithm to detect if two date ranges overlap?"

**Solution:** Two ranges [s1, e1] and [s2, e2] overlap when `s1 < e2 AND s2 < e1`. Applied in the service layer, excluding the order being edited from the check.

