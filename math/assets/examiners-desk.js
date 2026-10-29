/* ============================================================
   THINK IN BITS · 9709 · THE EXAMINER'S DESK (shared game file)
   Load after KaTeX (katex.min.js + auto-render.min.js) and marks.js.
   A topic page holds only its own scripts and calls:
     TIBDesk.start({ topic: '1.3', kicker: '...', title: '...', intro: '...', known: ['M','A','B'], scripts: [...] })
   Tabs: Learn the marks · Mark a script · Code check · Marker mode.
   Optional cfg.marker: Marker mode's whole scripts, as pack script ids or full script objects.
   A scheme line may have pick: ['B2','B1','B0'] (part credit) with a: 'B1'; '1 mark' is a code not printed.
   Saved progress: localStorage 'tib-tool:examiners-desk:<topic>', every read and write in try/catch,
   validated on load; the page works fully with storage blocked.
   Code definitions quote the Mark Scheme Notes and Abbreviations, MS 9709/11 June 2023 pp.3 to 5
   (short exact quotes, spelling Americanized). Every example line was checked on its PDF page.
   ============================================================ */
(function () {
  'use strict';
  var R = String.raw;

  /* ---------------------------------------------------------------- code cards */
  var MS11 = 'Cambridge mark scheme 9709/11, June 2023';
  var MS12 = 'Cambridge mark scheme 9709/12, June 2024';
  var CARDS = {
    M: { code: 'M', group: 'kinds', name: 'Method mark',
      plain: 'You chose a method that works for this question and actually put this question\'s numbers into it.',
      quote: 'awarded for a valid method applied to the problem. Method marks are not lost for numerical errors, algebraic slips or errors in units.',
      qsrc: 'Mark Scheme Notes, ' + MS11 + ', p.4',
      ex: { c: 'M1', t: R`Gradient of radius \(= \dfrac{10-2}{6-0} = \dfrac43\) or gradient of tangent \(= -\dfrac34\)`, src: 'June 2023 9709/11 Q12(b), mark scheme p.20' },
      earn: 'Show the method with your numbers in it: the equation you set up, the substitution, the formula with values.',
      lose: 'Quoting a formula and stopping, or writing only an answer. A slip in the arithmetic afterwards does not lose it.',
      chk: { q: R`Ana writes \((12+6a)^2 - 4(2)(9a^2+18) = 0\) for "\(b^2 - 4ac = 0\)", then makes a sign slip when she expands. Does she keep the M mark for using the discriminant?`,
        o: ['Yes', 'No, the slip loses it', 'Only if her final answer is right'], ok: 0,
        why: 'Her method is valid and uses this question\'s numbers. Method marks are not lost for slips. The slip will cost her the accuracy marks that follow.' } },
    A: { code: 'A', group: 'kinds', name: 'Accuracy mark',
      plain: 'A correct answer or correct step, reached by the method the M mark pays for.',
      quote: 'Accuracy marks cannot be given unless the associated method mark is earned (or implied).',
      qsrc: 'Mark Scheme Notes, ' + MS11 + ', p.4',
      ex: { c: 'A1', t: R`Equation of tangent is \(y - 10 = -\dfrac34(x - 6)\)`, src: 'June 2023 9709/11 Q12(b), mark scheme p.20' },
      earn: 'Get the value right, by a method that earned (or implies) the M mark before it.',
      lose: 'A wrong value. Also a right value with no method behind it, such as a calculator answer with no working.',
      chk: { q: R`The scheme has M1 for setting up \(b^2 - 4ac = 0\), then A1 for \(k = 2\). A student solves on a calculator and writes only \(k = 2\). What do they score?`,
        o: ['0 of 2', '1 of 2 (the A1)', '2 of 2'], ok: 0,
        why: 'No method was shown, so the M1 is not earned, and the A1 needs it. The June 2023 examiner report says writing down only a calculator solution is not sufficient.' } },
    B: { code: 'B', group: 'kinds', name: 'B mark',
      plain: 'A mark for a correct result or statement on its own. It does not need a method mark, and nothing else needs it unless it is starred.',
      quote: 'Mark for a correct result or statement independent of method marks.',
      qsrc: 'Mark Scheme Notes, ' + MS11 + ', p.4',
      ex: { c: 'B1', t: R`\(x^2 + (y - 2)^2 = 100\)`, src: 'June 2023 9709/11 Q12(a), mark scheme p.20' },
      earn: 'Write the correct value, fact or statement.',
      lose: 'A wrong value. Losing a plain B1 does not stop you earning the M marks that come later.',
      chk: { q: R`June 2023 Q12: a student writes \(x^2 + (y-2)^2 = 10\) in (a). In (b) they find the tangent correctly. Does the mistake in (a) cost them marks in (b)?`,
        o: ['No, (b) is marked on its own work', 'Yes, everything after (a) is lost'], ok: 0,
        why: 'The B1 in (a) is lost. Part (b) uses the point and the center, which are both right, so its marks stand.' } },
    B2: { code: 'B2', group: 'kinds', name: 'B2 (two marks, part credit)',
      plain: 'A two-mark B for a statement with several elements: B2 for all of them, B1 for most of them, B0 otherwise. The scheme says how many elements earn B1.',
      quote: 'B2 for all 3, B1 for 2 out of 3',
      qsrc: 'Guidance column, ' + MS12 + ', Q2, p.7',
      ex: { c: 'B2', t: R`Translation \(\begin{pmatrix}3\\0\end{pmatrix}\) and \(\begin{pmatrix}0\\-8\end{pmatrix}\) (the word and the two vectors are the 3 elements)`, src: 'June 2024 9709/12 Q2, mark scheme p.7' },
      earn: 'Every element: the name of the transformation and each vector or value.',
      lose: 'One wrong element drops you to B1; two drop you to B0.',
      chk: { q: R`Using that scheme line, a student writes "translation \(\begin{pmatrix}3\\0\end{pmatrix}\), then translation \(\begin{pmatrix}0\\8\end{pmatrix}\)". What do they score for this line?`,
        o: ['B2', 'B1', 'B0'], ok: 1,
        why: 'The word and the first vector are right, the second vector has the wrong sign: 2 out of 3 elements, so B1.' } },
    STAR: { code: '*', group: 'depend', name: 'Starred mark (*M1 or M1*)',
      plain: 'A star means a later mark leans on this one. Cambridge writes it before or after: *M1 and M1* mean the same.',
      quote: 'dependent on an earlier M or B (asterisked) mark in the scheme.',
      qsrc: 'Mark Scheme Notes (DM or DB), ' + MS11 + ', p.4',
      ex: { c: '*M1', t: R`\(kx - k = -\dfrac{1}{2x} \Rightarrow 2kx^2 - 2kx + 1\ [=0]\)`, src: 'June 2023 9709/11 Q5, mark scheme p.9' },
      earn: 'Earn it like any M or B mark.',
      lose: 'Lose it and you also lose every D mark that depends on it.',
      chk: { q: 'A scheme has M1* and, later, DM1. A student loses the M1*. What happens to the DM1?',
        o: ['It is lost too', 'It can still be earned', 'It becomes a B1'], ok: 0,
        why: 'DM1 depends on the starred mark. With no M1*, there is no DM1, however good the later working looks.' } },
    D: { code: 'D', group: 'depend', name: 'Dependent mark (DM, DB)',
      plain: 'A method or B mark you can only have if you earned the starred mark it depends on.',
      quote: 'The notation DM or DB is used to indicate that a particular M or B mark is dependent on an earlier M or B (asterisked) mark in the scheme.',
      qsrc: 'Mark Scheme Notes, ' + MS11 + ', p.4',
      ex: { c: 'DM1', t: R`\(b^2 - 4ac\ [=0] \Rightarrow \big([-]2k\big)^2 - 4(2k)(1)\ [=0]\). Guidance: "DM0 if \(x\) still present."`, src: 'June 2023 9709/11 Q5, mark scheme p.9' },
      earn: 'Earn the starred mark first, then do this step correctly.',
      lose: 'Lose the starred mark and this one goes with it. When a scheme has two starred marks before one DM1 (June 2024 9709/12 Q10(b)), we read the DM1 as needing both, as in the 1.3 Session 1 deck.',
      chk: { q: R`June 2023 Q5: a student writes \(-\dfrac{1}{2x}\) as \(-\dfrac12 x\), so they never get a quadratic (no *M1). They then write "\(b^2 - 4ac = 0\)" with some numbers. DM1?`,
        o: ['No DM1', 'DM1, because they used the discriminant'], ok: 0,
        why: 'The DM1 depends on the *M1 for forming the 3-term quadratic. Without it, the DM1 cannot be awarded.' } },
    FT: { code: 'FT', group: 'depend', name: 'Follow through',
      plain: 'You can still earn this A or B mark using your own earlier wrong answer, if you use it correctly.',
      quote: 'allowed for work correctly following on from previously incorrect results.',
      qsrc: 'Mark Scheme Notes, ' + MS11 + ', p.4',
      ex: { c: 'A1FT', t: R`Equation of circle \(Q\) is \(x^2 + \left(y - their\ \tfrac{29}{2}\right)^2 = \left(\tfrac{5\sqrt5}{2}\right)^2\)`, src: 'June 2023 9709/11 Q12(c), mark scheme p.20' },
      earn: 'Use your earlier value correctly in this step. The scheme writes "their" for your value.',
      lose: 'A new slip in this step. FT forgives the earlier error only.',
      chk: { q: R`In Q12(b) a student got the wrong tangent, which meets the \(y\)-axis at \((0, 2)\). In (c) they write \(x^2 + (y - 2)^2 = \tfrac{125}{4}\) for circle \(Q\). A1FT?`,
        o: ['Yes', 'No, the center is wrong'], ok: 0,
        why: 'Their center (0, 2) comes correctly from their own tangent and the radius is right, so the A1FT is earned.' } },
    OE: { code: 'OE', group: 'abbr', name: 'Or Equivalent (AEF)',
      plain: 'Any form of the answer that means the same thing is accepted.',
      quote: 'AEF/OE: Any Equivalent Form (of answer is equally acceptable) / Or Equivalent',
      qsrc: 'Abbreviations, ' + MS11 + ', p.5',
      ex: { c: 'B1', t: R`\(x^2 + (y-2)^2 = 100\). Guidance: "OE e.g. \((x-0)^2 + (y-2)^2 = 10^2\) ISW."`, src: 'June 2023 9709/11 Q12(a), mark scheme p.20' },
      earn: 'Any correct equivalent form, unless the question asks for a particular form.',
      lose: 'When the question names a form ("in the form \(ax + by + c = 0\)") and you leave it in another.',
      chk: { q: R`June 2024 9709/12 Q10(b) wants \(ax + by + c = 0\) with integers. The scheme gives \(2x - 13y + 247 = 0\) "or ± integer multiples of this". A student writes \(-4x + 26y - 494 = 0\). A1?`,
        o: ['Yes', 'No'], ok: 0, why: 'It is \(-2\) times the scheme answer, an integer multiple, in the form asked.' } },
    AG: { code: 'AG', group: 'abbr', name: 'Answer Given',
      plain: 'The answer is printed in the question ("Show that..."), so the marks are for the working that gets there.',
      quote: 'Answer Given on the question paper (so extra checking is needed to ensure that the detailed working leading to the result is valid)',
      qsrc: 'Abbreviations, ' + MS11 + ', p.5',
      ex: { c: 'A1', t: R`\(\Rightarrow 12\sin^2\theta - 7\sin\theta - 12 = 0\). Guidance: "AG, WWW".`, src: 'June 2024 9709/12 Q3(a), mark scheme p.9' },
      earn: 'Every step to the printed answer, shown and correct.',
      lose: 'A missing step or a wrong step, even when your last line matches the question.',
      chk: { q: 'A "show that" question. A student writes the first line, skips the middle, and copies the printed answer as the last line. The final A1 is AG. Do they earn it?',
        o: ['No', 'Yes, the answer is right'], ok: 0, why: 'With AG, the answer is already known. The mark is for valid working that reaches it, so a gap loses it.' } },
    CAO: { code: 'CAO', group: 'abbr', name: 'Correct Answer Only',
      plain: 'Only the exact correct answer scores. No follow through from an earlier error.',
      quote: 'Correct Answer Only (emphasizing that no ‘follow through’ from a previous error is allowed)',
      qsrc: 'Abbreviations, ' + MS11 + ', p.5 (spelling Americanized)',
      ex: { c: 'A1', t: R`\([f(x) =]\ (2x-3)^3 - 3x^2 + 3\). Guidance: "CAO".`, src: 'June 2024 9709/12 Q9(b), mark scheme p.23' },
      earn: 'The right answer.', lose: 'Any wrong answer, even one that follows correctly from your earlier slip.',
      chk: { q: 'An earlier slip gives a student the wrong constant, and they use it perfectly to reach a wrong final answer. That final mark is A1 CAO. Do they earn it?',
        o: ['No', 'Yes, by follow through'], ok: 0, why: 'CAO means no follow through. Only the correct answer earns it.' } },
    CWO: { code: 'CWO', group: 'abbr', name: 'Correct Working Only',
      plain: 'The mark needs the answer reached by correct working, with no errors on the way.',
      quote: 'Correct Working Only', qsrc: 'Abbreviations, ' + MS11 + ', p.5',
      ex: null, exnote: 'CWO does not appear in the 9709/11 June 2023 or 9709/12 June 2024 schemes we use. It is on the list, so you may still meet it.',
      earn: 'The right answer from working with no mistakes.', lose: 'Any error in the working, even if it cancels out.',
      chk: { q: 'Two sign errors cancel and the student reaches the right final answer. The mark is A1 CWO. Earned?',
        o: ['No', 'Yes'], ok: 0, why: 'CWO needs correct working all the way. Errors that cancel still count as errors.' } },
    ISW: { code: 'ISW', group: 'rules', name: 'Ignore Subsequent Working',
      plain: 'Once the correct answer is written, extra work after it is ignored, even if it is wrong.',
      quote: 'marks once gained cannot subsequently be lost, e.g. wrong working following a correct form of answer is ignored (isw).',
      qsrc: 'Mathematics Specific Marking Principle 4, ' + MS11 + ', p.3',
      ex: { c: 'A1', t: R`\(y - 10 = -\dfrac34(x - 6)\). Guidance: "OE ISW".`, src: 'June 2023 9709/11 Q12(b), mark scheme p.20' },
      earn: 'Write the correct answer. What you do after it does not take it away.',
      lose: 'You only lose it if the later working changes the answer you are using, or the scheme says "do not ISW".',
      chk: { q: R`A student writes the tangent \(y - 10 = -\tfrac34(x - 6)\), then rearranges it wrongly to \(4y = 3x + 22\). The scheme says A1 OE ISW. Do they keep the A1?`,
        o: ['Yes', 'No'], ok: 0, why: 'The correct equation was written. ISW: the wrong rearrangement after it is ignored.' } },
    SOI: { code: 'SOI', group: 'abbr', name: 'Seen Or Implied',
      plain: 'The mark is earned if the value is written down, or if your later working shows you clearly had it.',
      quote: 'Seen Or Implied', qsrc: 'Abbreviations, ' + MS11 + ', p.5',
      ex: { c: 'M1', t: R`Coordinates of center of circle \(Q\) are \(\left(0, their\ \tfrac{29}{2}\right)\). Guidance: "SOI From a linear equation in (b)."`, src: 'June 2023 9709/11 Q12(c), mark scheme p.20' },
      earn: 'Write it, or use it correctly so it is clear you had it.', lose: 'When nothing written shows you had it.',
      chk: { q: R`A student never writes "center \((0, 14.5)\)" but writes \(x^2 + (y - 14.5)^2 = 31.25\). Is the SOI mark for the center earned?`,
        o: ['Yes, it is implied', 'No, it was never written'], ok: 0, why: 'Their equation uses the center correctly, so it is implied.' } },
    SC: { code: 'SC', group: 'abbr', name: 'Special Case',
      plain: 'A mark the scheme sets out for one particular kind of answer, often a right answer with missing working.',
      quote: 'Special Case (detailing the mark to be given for a specific wrong solution, or a case where some standard marking practice is to be varied in the light of a particular circumstance)',
      qsrc: 'Abbreviations, ' + MS11 + ', p.5',
      ex: { c: 'A1', t: R`\(a = 3\). Guidance: "If M0, SC B1 for \(a = 3\) with no working."`, src: 'June 2023 9709/11 Q8(a), mark scheme p.14' },
      earn: 'Exactly the case the scheme describes.', lose: 'Anything else: SC marks are an exception, never the plan.',
      chk: { q: R`June 2023 Q8(a) has M1 A1 for \(a\). A student writes only \(a = 3\), no working. What do they score for those two marks?`,
        o: ['SC B1, so 1 mark', '2 marks', '0 marks'], ok: 0, why: 'M0 (no method), so A0, but the scheme gives SC B1 for \(a = 3\) with no working.' } },
    WWW: { code: 'WWW', group: 'abbr', name: 'Without Wrong Working',
      plain: 'The answer earns the mark only if no wrong working led to it.',
      quote: 'Without Wrong Working', qsrc: 'Abbreviations, ' + MS11 + ', p.5',
      ex: { c: 'B1', t: R`7(c): \(1\). Guidance: "WWW".`, src: 'June 2023 9709/11 Q7(c), mark scheme p.13' },
      earn: 'A right answer with no mistakes on the way.', lose: 'A right answer that came out of wrong working.',
      chk: { q: 'A student reaches the right answer, but only after an error that happened to give it. The mark is B1 WWW. Earned?',
        o: ['No', 'Yes'], ok: 0, why: 'WWW: a lucky right answer from wrong working does not score.' } },
    AWRT: { code: 'AWRT', group: 'abbr', name: 'Answer Which Rounds To',
      plain: 'Any answer that rounds to the given value scores. More decimal places are fine.',
      quote: 'Answer Which Rounds To', qsrc: 'Abbreviations, ' + MS11 + ', p.5',
      ex: { c: 'A1', t: R`\(\dfrac59\) or \(0.556\). Guidance: "AWRT".`, src: 'June 2024 9709/12 Q10(a), mark scheme p.24' },
      earn: 'A value that rounds to the scheme\'s answer.', lose: 'Rounding too early, so your answer rounds to something else.',
      chk: { q: R`For that line, which answer loses the A1?`, o: ['0.55', '0.5556', '5/9'], ok: 0,
        why: '0.55 rounds to 0.55, which is 0.550 to 3 significant figures. The others round to 0.556 or are exact.' } },
    MISREAD: { code: 'MR', group: 'rules', name: 'Misread',
      plain: 'You copied a number wrongly from the question and used it all the way through. If the question is no easier, you lose just 1 mark.',
      quote: 'Where a candidate has misread a number in the question and used that value consistently throughout, provided that number does not alter the difficulty or the method required, award all marks earned and deduct just 1 mark for the misread.',
      qsrc: 'Mathematics Specific Marking Principle 5, ' + MS11 + ', p.3',
      ex: null, exnote: 'The 9709/12 June 2024 scheme adds that the 1 mark taken off is an A or B mark (p.3).',
      earn: 'Your method marks, as long as the misread number does not make the question easier.', lose: '1 A or B mark for the misread, or more if the question became easier.',
      chk: { q: R`J24 Q7: a student copies the radius squared as 16 for 18 and uses it consistently. The question is no easier. What happens?`,
        o: ['All marks earned, minus 1', 'Every mark after the misread is lost', 'No penalty'], ok: 0,
        why: 'Principle 5: award what was earned and deduct just 1 mark.' } },
    SF: { code: '3 s.f.', group: 'rules', name: 'Accuracy of answers',
      plain: 'Non-exact answers need 3 significant figures, or 1 decimal place for angles in degrees, unless the question says otherwise.',
      quote: 'allow the A or B mark if the answer is correct to 3 significant figures or would be correct to 3 significant figures if rounded (1 decimal place for angles in degrees).',
      qsrc: 'Mark Scheme Notes, ' + MS11 + ', p.4',
      ex: { c: 'B1', t: R`\([\theta =]\ 228.6^\circ,\ 311.4^\circ\). Guidance: "AWRT".`, src: 'June 2024 9709/12 Q3(b), mark scheme p.9' },
      earn: 'Keep full calculator values, then round the final answer to 3 s.f. (angles to 1 d.p.).', lose: 'Rounding too early, or giving 2 s.f.',
      chk: { q: 'An angle in degrees comes out as 228.5904... and the scheme wants 1 decimal place. Which answer is the risky one?',
        o: ['228', '228.6', '228.59'], ok: 0, why: '228 is not correct to 1 decimal place. 228.6 is right, and 228.59 rounds to 228.6, so it is accepted too.' } }
  };

  var GROUPS = [
    ['kinds', 'Kinds of mark', ['M', 'A', 'B', 'B2']],
    ['depend', 'How marks depend on each other', ['STAR', 'D', 'FT']],
    ['abbr', 'Abbreviations', ['OE', 'AG', 'CAO', 'CWO', 'SOI', 'SC', 'WWW', 'AWRT']],
    ['rules', 'Rules that change marks', ['ISW', 'MISREAD', 'SF']]
  ];

  /* which card a scheme code opens: the most specific part first */
  function cardFor(code) {
    var c = String(code).replace(/\s/g, '');
    if (/FT/.test(c)) return 'FT';
    if (/^D[MB]/.test(c)) return 'D';
    if (/\*/.test(c)) return 'STAR';
    if (/^B2/.test(c)) return 'B2';
    if (/^SC/.test(c)) return 'SC';
    var m = c.match(/^[A-Z]+/); var k = m ? m[0] : c;
    if (k === 'MR') return 'MISREAD';
    if (k === 'AEF') return 'OE';
    return CARDS[k] ? k : null;
  }
  /* the plain codes a scheme code is built from, for "new code" notes and ticks */
  function partsOf(code) {
    var c = String(code).replace(/\s/g, ''), out = [];
    var m = c.match(/^[A-Z]/); if (m) out.push(/^B2/.test(c) ? 'B2' : (m[0] === 'D' ? 'D' : m[0]));
    if (/^D[MB]/.test(c)) out.push(c[1]);
    if (/\*/.test(c)) out.push('STAR');
    if (/FT/.test(c)) out.push('FT');
    return out;
  }

  /* ---------------------------------------------------------------- code check scenarios */
  var SCEN = [
    { k: 'M', q: R`The method is right but there is a sign slip when expanding \((12 + 6a)^2\). Is the M1 for using the discriminant still earned?`, o: ['Yes', 'No'], ok: 0,
      why: 'Method marks are not lost for numerical errors or algebraic slips.' },
    { k: 'A', q: R`A student finds \(k = 2\) by trial on a calculator, with no working. The scheme is M1 (set up \(b^2 - 4ac = 0\)) then A1 (\(k = 2\)). How many marks?`, o: ['0', '1', '2'], ok: 0,
      why: 'No method shown, so M0, and the A1 needs the M1.' },
    { k: 'B', q: R`Spec Q10: a student states the center \(C(-2, 1)\) correctly, then every line after it is wrong. Do they keep the B1 for \(C\)?`, o: ['Yes', 'No'], ok: 0,
      why: 'A B mark is independent of the rest. Marks once earned are not lost.' },
    { k: 'D', q: 'A student loses the *M1 for forming the quadratic, but the next line uses b² − 4ac perfectly on what they wrote. DM1?', o: ['No', 'Yes'], ok: 0,
      why: 'DM1 depends on the starred mark, which was lost.' },
    { k: 'FT', q: R`A student's center is wrong from part (a). In (b) they use it correctly in a step marked A1FT. Earned?`, o: ['Yes', 'No'], ok: 0,
      why: 'FT allows work that correctly follows from an earlier wrong result.' },
    { k: 'CAO', q: 'Same situation, but the step is marked A1 CAO. Earned?', o: ['No', 'Yes'], ok: 0,
      why: 'CAO: correct answer only, no follow through.' },
    { k: 'AG', q: R`"Show that the equation can be written as \(12\sin^2\theta - 7\sin\theta - 12 = 0\)." A student writes the first line and then the printed answer. A1 (AG)?`, o: ['No', 'Yes'], ok: 0,
      why: 'With AG the working is what is marked, so a skipped step loses the A1.' },
    { k: 'ISW', q: 'A student writes the correct line equation, then multiplies out wrongly underneath. The scheme says A1 OE ISW. Kept?', o: ['Yes', 'No'], ok: 0,
      why: 'ISW: the correct answer was written, so later wrong working is ignored.' },
    { k: 'OE', q: R`The answer is \(y = x - 10\). A student writes \(x - y - 10 = 0\). The question did not ask for a form. Earned?`, o: ['Yes', 'No'], ok: 0,
      why: 'An equivalent form is accepted when no form is asked for.' },
    { k: 'MISREAD', q: 'A student reads 18 as 16 in the circle equation and uses 16 all the way through. The question is no easier. How much does the misread cost?', o: ['1 mark', 'Every mark after it', 'Nothing'], ok: 0,
      why: 'Principle 5: award all marks earned and deduct just 1 mark.' }
  ];

  /* ---------------------------------------------------------------- helpers */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function bt(label, cls) { var b = el('button', cls || 'ghost', label); b.type = 'button'; return b; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function math(node) {
    if (window.renderMathInElement) renderMathInElement(node, { delimiters: [{ left: '\\(', right: '\\)', display: false }, { left: '\\[', right: '\\]', display: true }], throwOnError: false });
    return node;
  }
  function chip(code, cls) {
    var k = cardFor(code);
    if (!k) return '<span class="tib-mk-chip' + (cls ? ' ' + cls : '') + '">' + esc(code) + '</span>';
    return '<button type="button" class="tib-mk-chip' + (cls ? ' ' + cls : '') + '" data-card="' + k + '" aria-label="' + esc(code) + ': what this code means">' + esc(code) + '</button>';
  }
  function modelHTML(s) {
    return '<div class="model">' + s.model.map(function (l) {
      var cs = !l.c ? [] : isGen(l.c) ? [l.c] : l.c.split(' ');
      return '<div class="ml"><span>' + l.t + '</span><span>' + cs.map(function (c) { return chip(c); }).join(' ') + '</span></div>';
    }).join('') + '</div>';
  }
  /* "1 mark": a mark whose code is not printed (Example Candidate Responses) */
  function isGen(code) { return /^\d/.test(String(code)); }
  /* marks a decision is worth: true/false for one-mark lines, a label such as 'B1' for part-credit lines (m.pick) */
  function val(m, d) {
    if (d == null) return 0;
    if (m.pick) return typeof d === 'string' ? (parseInt(d.replace(/\D/g, ''), 10) || 0) : 0;
    return d === true ? (m.n || 1) : 0;
  }
  function earnedOf(s) { return s.scheme.reduce(function (a, m) { return a + val(m, m.a); }, 0); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function rankFor(p) { return p >= 85 ? 'Principal Examiner' : p >= 65 ? 'Team Leader' : p >= 40 ? 'Assistant Examiner' : 'Trainee Marker'; }

  /* ---------------------------------------------------------------- start */
  function start(cfg) {
    var KEY = 'tib-tool:examiners-desk:' + cfg.topic;
    var scripts = cfg.scripts || [];
    var ids = {}; scripts.forEach(function (s) { ids[s.id] = s; });
    /* Marker mode list: ids of pack scripts, or whole-script objects of its own */
    var mlist = (cfg.marker || []).map(function (x) { return typeof x === 'string' ? ids[x] : x; }).filter(Boolean);
    var mids = {}; mlist.forEach(function (s) { mids[s.id] = s; });

    /* saved state, validated */
    function load() {
      var st = { best: {}, cc: {}, learned: {}, mk: {}, tab: 'learn' };
      try {
        var raw = JSON.parse(localStorage.getItem(KEY) || '{}');
        if (raw && typeof raw === 'object') {
          if (raw.best && typeof raw.best === 'object') Object.keys(raw.best).forEach(function (id) {
            var v = raw.best[id]; if (ids[id] && typeof v === 'number' && isFinite(v) && v >= 0 && v <= 100) st.best[id] = Math.round(v);
          });
          if (raw.mk && typeof raw.mk === 'object') Object.keys(raw.mk).forEach(function (id) {
            var v = raw.mk[id]; if (mids[id] && typeof v === 'number' && isFinite(v) && v >= 0 && v <= 100) st.mk[id] = Math.round(v);
          });
          if (raw.cc && typeof raw.cc === 'object') Object.keys(raw.cc).forEach(function (k) {
            var v = raw.cc[k]; if (CARDS[k] && typeof v === 'number' && v >= 0 && v < 1000) st.cc[k] = Math.floor(v);
          });
          if (raw.learned && typeof raw.learned === 'object') Object.keys(raw.learned).forEach(function (k) { if (CARDS[k] && raw.learned[k] === true) st.learned[k] = true; });
          if (['learn', 'mark', 'check', 'marker'].indexOf(raw.tab) >= 0) st.tab = raw.tab;
        }
      } catch (e) {}
      return st;
    }
    var S = load();
    function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

    /* ---------- page shell ---------- */
    var wrap = $('#desk');
    wrap.innerHTML =
      '<header><div class="kicker">' + esc(cfg.kicker || 'Cambridge 9709') + '</div><h1>The Examiner’s Desk</h1>' +
      '<p class="sub">' + cfg.intro + '</p></header>' +
      '<div class="status" id="dStatus" aria-live="polite"></div>' +
      '<div class="tabs" role="tablist" aria-label="Desk">' +
      '<button class="tab" role="tab" type="button" id="tab-learn" aria-controls="p-learn">Learn the marks</button>' +
      '<button class="tab" role="tab" type="button" id="tab-mark" aria-controls="p-mark">Mark a script</button>' +
      '<button class="tab" role="tab" type="button" id="tab-check" aria-controls="p-check">Code check</button>' +
      '<button class="tab" role="tab" type="button" id="tab-marker" aria-controls="p-marker">Marker mode</button></div>' +
      '<section class="tabpanel" role="tabpanel" id="p-learn" aria-labelledby="tab-learn"></section>' +
      '<section class="tabpanel" role="tabpanel" id="p-mark" aria-labelledby="tab-mark"></section>' +
      '<section class="tabpanel" role="tabpanel" id="p-check" aria-labelledby="tab-check"></section>' +
      '<section class="tabpanel" role="tabpanel" id="p-marker" aria-labelledby="tab-marker"></section>' +
      '<div class="row no-print" style="margin-top:22px"><button type="button" class="ghost" id="dReset">Start over</button>' +
      '<span class="small muted" id="dResetNote">Clears this page’s saved scores and ticks in this browser.</span></div>' +
      '<section id="codeSheet" aria-hidden="true"></section>';
    math($('header', wrap));

    var TABS = ['learn', 'mark', 'check', 'marker'];
    function showTab(t, focus) {
      TABS.forEach(function (x) {
        var on = x === t; $('#tab-' + x).setAttribute('aria-selected', on ? 'true' : 'false'); $('#tab-' + x).tabIndex = on ? 0 : -1;
        $('#p-' + x).hidden = !on;
      });
      S.tab = t; save(); if (focus) $('#tab-' + t).focus();
    }
    TABS.forEach(function (t, i) {
      var b = $('#tab-' + t);
      b.addEventListener('click', function () { showTab(t); });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); showTab(TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length], true); }
      });
    });

    function status() {
      var done = scripts.filter(function (s) { return S.best[s.id] != null; });
      var avg = done.length ? Math.round(done.reduce(function (a, s) { return a + S.best[s.id]; }, 0) / scripts.length) : 0;
      var ticks = Object.keys(S.cc).filter(function (k) { return S.cc[k] >= 2; }).length;
      var learned = Object.keys(S.learned).length;
      $('#dStatus').innerHTML = 'Rank <b>' + (done.length ? rankFor(avg) : 'Trainee Marker') + '</b> · Scripts marked <b>' + done.length + ' of ' + scripts.length + '</b>' +
        (done.length ? ' · Desk score <b>' + avg + '%</b>' : '') + (mlist.length ? ' · Marker mode <b>' + Object.keys(S.mk).length + ' of ' + mlist.length + '</b>' : '') + ' · Codes learned <b>' + learned + ' of ' + Object.keys(CARDS).length + '</b> · Code check ticks <b>' + ticks + ' of ' + SCEN.length + '</b>';
    }

    /* ---------- a code card ---------- */
    function cardHTML(k) {
      var c = CARDS[k];
      var h = '<div class="head"><span class="big">' + esc(c.code) + '</span><span class="name">' + esc(c.name) + '</span></div>' +
        '<p>' + c.plain + '</p>' +
        '<div class="quote">“' + esc(c.quote) + '”<cite>' + esc(c.qsrc) + '</cite></div>';
      if (c.ex) h += '<div class="ex"><span class="lbl" style="color:#555">A real mark-scheme line</span><div>' + c.ex.t + ' ' + chip(c.ex.c) + '</div><span class="exsrc">' + esc(c.ex.src) + '</span></div>';
      else if (c.exnote) h += '<p class="small muted">' + esc(c.exnote) + '</p>';
      h += '<div class="el"><div class="earn"><span class="lbl">How you earn it</span>' + c.earn + '</div><div class="lose"><span class="lbl">How you lose it</span>' + c.lose + '</div></div>';
      h += '<div class="chk"><span class="lbl">Quick check</span><p class="cc-q">' + c.chk.q + '</p><div class="opts"></div><div class="say" hidden></div></div>';
      return h;
    }
    function wireCheck(box, k, onRight) {
      var c = CARDS[k], o = $('.opts', box), say = $('.say', box);
      c.chk.o.forEach(function (t, i) {
        var b = bt(t, 'opt'); o.appendChild(b);
        b.addEventListener('click', function () {
          var right = i === c.chk.ok;
          $$('.opt', o).forEach(function (x, j) { x.classList.toggle('right', j === c.chk.ok && right); x.classList.toggle('wrong', x === b && !right); });
          say.hidden = false; say.className = 'say ' + (right ? 'ok' : 'no');
          say.innerHTML = '<b class="t">' + (right ? 'Right.' : 'Not this one. Try again.') + '</b>' + (right ? c.chk.why : '');
          math(say);
          if (right) { $$('.opt', o).forEach(function (x) { x.disabled = true; }); if (onRight) onRight(); }
        });
      });
    }
    var dlg = el('dialog', 'codedlg'); dlg.setAttribute('aria-label', 'What this code means'); document.body.appendChild(dlg);
    function openCard(k, from) {
      if (!CARDS[k]) return;
      dlg.innerHTML = '<div class="codecard"><button type="button" class="ghost close">Close</button>' + cardHTML(k) + '</div>';
      math(dlg); wireCheck(dlg, k, function () { S.learned[k] = true; save(); status(); renderLearnTicks(); });
      $('.close', dlg).addEventListener('click', function () { dlg.close(); });
      dlg.addEventListener('close', function once() { dlg.removeEventListener('close', once); if (from && from.focus) from.focus(); });
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
      $('.close', dlg).focus();
    }
    /* tap any code, anywhere on the page */
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('button.tib-mk-chip[data-card]');
      if (!t || t.closest('#p-learn .chips')) return;
      openCard(t.getAttribute('data-card'), t);
    });

    /* ================================================================ Learn the marks */
    var learn = $('#p-learn');
    function renderLearn() {
      var h = '<div class="card"><h2>What every code means</h2><p class="muted small">Tap a code to open its card: what it pays for, Cambridge’s own definition, a real mark-scheme line, how you earn it, how you lose it and a quick check. A tick means you got its check right.</p>';
      GROUPS.forEach(function (g) {
        h += '<div class="group"><h3>' + esc(g[1]) + '</h3><div class="chips">' +
          g[2].map(function (k) { return '<button type="button" class="tib-mk-chip" data-card="' + k + '" aria-pressed="false">' + esc(CARDS[k].code) + '</button>'; }).join('') + '</div></div>';
      });
      h += '<div id="learnCard"></div>';
      h += '<div class="row" style="margin-top:16px"><button type="button" class="ghost" id="printCard">Print the code card</button><span class="small muted">One page: every code, what it pays for and what loses it.</span></div></div>';
      learn.innerHTML = h;
      $$('.chips button', learn).forEach(function (b) {
        b.addEventListener('click', function () {
          var k = b.getAttribute('data-card');
          $$('.chips button', learn).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          var box = $('#learnCard'); box.className = 'codecard'; box.innerHTML = cardHTML(k); math(box);
          wireCheck(box, k, function () { S.learned[k] = true; save(); status(); renderLearnTicks(); });
        });
      });
      $('#printCard').addEventListener('click', printCard);
      renderLearnTicks();
    }
    function renderLearnTicks() { $$('#p-learn .chips button').forEach(function (b) { b.classList.toggle('tick', !!S.learned[b.getAttribute('data-card')]); }); }

    function buildSheet() {
      var rows = '';
      GROUPS.forEach(function (g) {
        rows += '<tr><th colspan="3">' + esc(g[1]) + '</th></tr>';
        g[2].forEach(function (k) { var c = CARDS[k]; rows += '<tr><td class="c">' + esc(c.code) + '</td><td>' + c.plain + '</td><td>' + c.lose + '</td></tr>'; });
      });
      $('#codeSheet').innerHTML = '<h2>Cambridge 9709 mark codes</h2><p>From the Mark Scheme Notes and Abbreviations of the published mark schemes (9709/11 June 2023, pp.3 to 5). Think In Bits · The Examiner’s Desk</p>' +
        '<table><thead><tr><th>Code</th><th>What it pays for</th><th>What loses it</th></tr></thead><tbody>' + rows + '</tbody></table>';
      math($('#codeSheet'));
    }
    function printCard() {
      buildSheet(); document.body.classList.add('print-card');
      var done = function () { document.body.classList.remove('print-card'); window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done);
      window.print();
      setTimeout(done, 1500);
    }

    /* ================================================================ Mark a script */
    var mark = $('#p-mark');
    var seenCodes = {};
    (cfg.known || []).forEach(function (k) { seenCodes[k] = true; });
    /* codes new in this pack, in script order */
    var newIn = {};
    scripts.forEach(function (s) {
      s.scheme.forEach(function (m) { partsOf(m.c).forEach(function (p) { if (!seenCodes[p]) { seenCodes[p] = true; (newIn[s.id] = newIn[s.id] || []).push(p); } }); });
    });

    function renderPicker() {
      var h = '<div class="card"><h2>Pick a script</h2><p class="muted small">Read the question and the student’s answer. Spot the first line that goes wrong, decide each mark the way a Cambridge examiner would, then choose the fix.</p><div class="pick">';
      scripts.forEach(function (s, i) {
        var b = S.best[s.id];
        h += '<button type="button" data-i="' + i + '"><span class="t">' + esc(s.title) + '</span><span class="s">' + esc(s.kind) + '</span>' +
          (b != null ? '<span class="d">Best ' + b + '%</span>' : '') + '</button>';
      });
      h += '</div></div>';
      mark.innerHTML = h;
      $$('.pick button', mark).forEach(function (b) { b.addEventListener('click', function () { play(+b.getAttribute('data-i')); }); });
    }

    function play(si) {
      var s = scripts[si], pts = 0, max = 0;
      var spotTries = 0, dec = [], fixTries = 0;
      mark.innerHTML = '';
      var top = el('div', 'row no-print'); var back = bt('‹ All scripts', 'ghost'); top.appendChild(back); mark.appendChild(top);
      back.addEventListener('click', function () { renderPicker(); mark.scrollIntoView({ block: 'start' }); });
      var card = el('div', 'card'); mark.appendChild(card);
      card.innerHTML = '<div class="qbox"><span class="src">' + esc(s.title) + '</span><div class="qt">' + s.q + '</div><div class="mk small">Total: ' + s.marks + ' marks</div></div>' +
        '<div class="stepper" aria-hidden="true"><span data-s="1">1 · Spot</span><span data-s="2">2 · Mark</span><span data-s="3">3 · Fix</span><span data-s="4">4 · Debrief</span></div>' +
        '<div class="sheet"><div class="who">' + esc(s.who) + '</div></div><div class="task" aria-live="polite"></div>';
      var sheet = $('.sheet', card), task = $('.task', card);
      function stepTo(n) { $$('.stepper span', card).forEach(function (x) { var k = +x.getAttribute('data-s'); x.classList.toggle('on', k === n); x.classList.toggle('done', k < n); }); }
      var rows = s.lines.map(function (ln, i) {
        var r = el('button', 'sl'); r.type = 'button'; r.setAttribute('data-i', i);
        r.innerHTML = '<span class="pt">' + (ln.p || '') + '</span><span class="w">' + ln.t + '</span><span class="mg"></span>';
        r.setAttribute('aria-label', 'Line ' + (i + 1));
        sheet.appendChild(r); return r;
      });
      math(card);

      /* step 1: spot */
      stepTo(1); max += 2;
      task.innerHTML = '<p class="ask">Tap the first line that goes wrong.</p><p class="small muted">' + (s.spotHint || 'Read each line against the question. Everything above the first wrong line is right.') + '</p><div class="say" hidden></div>';
      var say1 = $('.say', task);
      rows.forEach(function (r, i) {
        r.addEventListener('click', function () {
          if (task.getAttribute('data-step') !== '1') return;
          if (i !== s.wrong && s.lines[i].loose) {
            r.classList.add('picked-no'); say1.hidden = false; say1.className = 'say rule';
            say1.innerHTML = '<b class="t">Not quite the one.</b>' + s.lines[i].loose; math(say1); return;
          }
          spotTries++;
          if (i === s.wrong) { pts += spotTries === 1 ? 2 : spotTries === 2 ? 1 : 0; revealWrong(true); }
          else {
            r.classList.add('picked-no');
            say1.hidden = false; say1.className = 'say no';
            say1.innerHTML = '<b class="t">' + (i < s.wrong ? 'That line is correct.' : 'There is a mistake before this line.') + '</b>' + (spotTries >= 2 ? 'Here it is.' : 'Look again.');
            if (spotTries >= 2) revealWrong(false);
          }
        });
      });
      task.setAttribute('data-step', '1');
      function revealWrong(found) {
        task.setAttribute('data-step', '2');
        rows.forEach(function (r) { r.classList.remove('picked-no'); r.disabled = true; r.removeAttribute('aria-label'); });
        var w = rows[s.wrong]; w.classList.add('first-wrong');
        var note = el('span', 'wrongnote', '✗ ' + s.wrongNote); w.appendChild(note); math(note);
        say1.hidden = false; say1.className = 'say ' + (found ? 'ok' : 'no');
        say1.innerHTML = '<b class="t">' + (found ? 'Found it.' : 'This is the first wrong line.') + '</b>' + s.wrongNote;
        math(say1);
        var go = bt('Now mark it', 'go'); go.style.marginTop = '12px'; task.appendChild(go); go.focus();
        go.addEventListener('click', markStep);
      }

      /* step 2: award or withhold each mark-scheme line */
      function markStep() {
        stepTo(2);
        var newOnes = newIn[s.id] || [];
        task.innerHTML = '<p class="ask">Award or withhold each mark, in order.</p><p class="small muted">Tap any code to see what it means. A marks need their M mark; D marks need their starred mark.</p>' +
          (newOnes.length ? '<div class="newcode"><b>New code' + (newOnes.length > 1 ? 's' : '') + ' in this script:</b> ' + newOnes.map(function (k) { return chip(CARDS[k].code === '*' ? '*' : CARDS[k].code); }).join(' ') + '</div>' : '') +
          '<div class="ms"></div><div class="tally"></div>';
        var ms = $('.ms', task), tally = $('.tally', task);
        var msRows = s.scheme.map(function (m, j) {
          var r = el('div', 'msl todo');
          r.innerHTML = '<div class="cd">' + chip(m.c) + '</div><div class="what">' + m.d + '</div><div class="acts"></div><div class="res" hidden></div>';
          ms.appendChild(r); return r;
        });
        math(ms);
        var mine = 0;
        function upd() { tally.innerHTML = 'You have awarded <b>' + mine + '</b> of ' + s.marks + ' marks'; }
        upd();
        function ask(j) {
          if (j >= s.scheme.length) { return afterMarks(); }
          var m = s.scheme[j], r = msRows[j]; r.classList.remove('todo'); r.classList.add('cur');
          var acts = $('.acts', r), res = $('.res', r);
          var zero = m.pick ? m.pick[m.pick.length - 1] : false;
          var btns = m.pick ? m.pick.map(function (l, i) { return bt(l, i === 0 ? 'go' : 'ghost'); }) : [bt('Award', 'go'), bt('Withhold', 'ghost')];
          btns.forEach(function (b) { acts.appendChild(b); });
          max += 1;
          btns[0].focus();
          function decide(give, forced) {
            acts.innerHTML = '';
            var right = give === m.a; if (right) pts += 1;
            dec[j] = give; mine += val(m, give);
            r.classList.remove('cur'); r.classList.add(right ? 'got' : 'miss');
            res.hidden = false;
            var exSays = m.pick ? 'The examiner gives ' + m.a + '.' : 'The examiner ' + (m.a ? 'awards' : 'withholds') + ' it.';
            res.innerHTML = (forced ? '<b style="color:var(--amber)">Rule: ' + forced + '</b><br>' : '') +
              (right ? '<b>' + (forced ? 'And the examiner withholds it too.' : 'Same as the examiner.') + '</b> ' : '<b>' + exSays + '</b> ') + m.why;
            math(res);
            if (m.on != null && rows[m.on]) {
              var mg = $('.mg', rows[m.on]), got = val(m, m.a) > 0;
              mg.insertAdjacentHTML('beforeend', (got ? '<span class="tick">✓</span>' : '') + chip(m.pick && got ? m.a : m.c, got ? '' : 'lost'));
            }
            upd(); ask(j + 1);
          }
          /* dependency rules, enforced on the student's own marking */
          function blockedBy() {
            return (m.dep || []).filter(function (d) { return dec[d] !== undefined && val(s.scheme[d], dec[d]) === 0; })[0];
          }
          function ruleText(blocker) {
            var bc = s.scheme[blocker].c;
            if (isGen(m.c) || isGen(bc)) return 'This mark depends on the mark in row ' + (blocker + 1) + ', which you withheld, so it cannot be awarded.';
            return /^A/.test(m.c) ? m.c + ' needs its method mark ' + bc + ', which you withheld.' : m.c + ' depends on ' + bc + ', which you withheld, so it cannot be awarded.';
          }
          btns.forEach(function (b, i) {
            b.addEventListener('click', function () {
              var give = m.pick ? m.pick[i] : i === 0;
              if (val(m, give) > 0) { var bl = blockedBy(); if (bl != null) { decide(zero, ruleText(bl)); return; } }
              decide(give);
            });
          });
        }
        ask(0);
      }

      /* step 3: fix the first wrong line */
      function afterMarks() {
        var go = bt('Fix the wrong line', 'go'); go.style.marginTop = '12px'; task.appendChild(go); go.focus();
        go.addEventListener('click', fixStep);
      }
      function fixStep() {
        stepTo(3); max += 2;
        task.innerHTML = '<p class="ask">' + (s.fix.ask || 'Which line should replace the first wrong line?') + '</p><div class="opts"></div><div class="say" hidden></div>';
        var o = $('.opts', task), say = $('.say', task);
        var order = shuffle(s.fix.o.map(function (t, i) { return i; }));
        order.forEach(function (i) {
          var b = bt(s.fix.o[i], 'opt'); b.setAttribute('data-i', i); o.appendChild(b);
          b.addEventListener('click', function () {
            fixTries++;
            var right = i === s.fix.ok;
            b.classList.add(right ? 'right' : 'wrong');
            say.hidden = false; say.className = 'say ' + (right ? 'ok' : 'no');
            say.innerHTML = right ? '<b class="t">That fixes it.</b>' + s.fix.why : '<b class="t">Not this one.</b>' + (s.fix.no && s.fix.no[i] ? s.fix.no[i] : 'Check it against the question.');
            math(say);
            if (right) {
              pts += fixTries === 1 ? 2 : fixTries === 2 ? 1 : 0;
              $$('.opt', o).forEach(function (x) { x.disabled = true; });
              var nx = bt('See the debrief', 'go'); nx.style.marginTop = '12px'; task.appendChild(nx); nx.focus();
              nx.addEventListener('click', debrief);
            }
          });
        });
        math(o);
      }

      /* step 4: debrief */
      function debrief() {
        stepTo(4);
        var pct = Math.round(100 * pts / max);
        if (S.best[s.id] == null || pct > S.best[s.id]) S.best[s.id] = pct;
        save(); status();
        var earned = earnedOf(s);
        var h = '<div class="deb">' +
          '<div class="say ok"><b class="t">You scored ' + pts + ' of ' + max + ' (' + pct + '%): ' + rankFor(pct) + '.</b>The script scores ' + earned + ' of ' + s.marks + '.</div>' +
          '<div><h3>Why it went wrong</h3><p>' + s.whyWrong + '</p></div>' +
          '<div><h3>Model answer</h3>' + modelHTML(s) + '</div>' +
          '<div><h3>What the examiners said</h3><p>' + s.note + '</p></div>' +
          '<div class="srcline">' + esc(s.credit) + '</div>' +
          '<div class="row no-print">' + (si + 1 < scripts.length ? '<button type="button" class="go" id="nextS">Next script</button>' : '') + '<button type="button" class="ghost" id="allS">All scripts</button></div></div>';
        task.innerHTML = h; math(task);
        if ($('#nextS')) $('#nextS').addEventListener('click', function () { play(si + 1); mark.scrollIntoView({ block: 'start' }); });
        $('#allS').addEventListener('click', function () { renderPicker(); mark.scrollIntoView({ block: 'start' }); });
        ($('#nextS') || $('#allS')).focus();
      }
    }

    /* ================================================================ Code check */
    var check = $('#p-check');
    function renderCheck() {
      var order = shuffle(SCEN.map(function (x, i) { return i; })), n = 0, right = 0;
      check.innerHTML = '<div class="card"><div class="spread"><h2>Code check</h2><span class="lbl" id="ccN"></span></div><p class="small muted">Ten quick situations. A code gets a tick once you have answered its question right twice (over any rounds).</p>' +
        '<div id="ccBox"></div><div class="cc-ticks"><span class="lbl">Ticks</span><div class="chips" id="ccTicks" style="margin-top:6px"></div></div></div>';
      function ticks() {
        $('#ccTicks').innerHTML = SCEN.map(function (sc) { var k = sc.k; return '<button type="button" class="tib-mk-chip' + ((S.cc[k] || 0) >= 2 ? ' tick' : '') + '" data-card="' + k + '">' + esc(CARDS[k].code) + '</button>'; }).join('');
      }
      function one() {
        if (n >= order.length) {
          $('#ccN').textContent = 'Done';
          $('#ccBox').innerHTML = '<div class="say ok"><b class="t">' + right + ' of ' + order.length + ' right first time.</b>Play again for new ticks.</div><div class="row" style="margin-top:12px"><button type="button" class="go" id="ccAgain">Play again</button></div>';
          $('#ccAgain').addEventListener('click', renderCheck); $('#ccAgain').focus(); return;
        }
        var sc = SCEN[order[n]], first = true;
        $('#ccN').textContent = (n + 1) + ' of ' + order.length;
        var box = $('#ccBox');
        box.innerHTML = '<p class="cc-q">' + sc.q + '</p><div class="opts"></div><div class="say" hidden></div>';
        var o = $('.opts', box), say = $('.say', box);
        sc.o.forEach(function (t, i) {
          var b = bt(t, 'opt'); o.appendChild(b);
          b.addEventListener('click', function () {
            var ok = i === sc.ok;
            b.classList.add(ok ? 'right' : 'wrong');
            say.hidden = false; say.className = 'say ' + (ok ? 'ok' : 'no');
            say.innerHTML = '<b class="t">' + (ok ? 'Right.' : 'Not this one.') + '</b>' + (ok ? sc.why + ' ' + chip(CARDS[sc.k].code) : 'Try again.');
            math(say);
            if (ok) {
              if (first) { right++; S.cc[sc.k] = (S.cc[sc.k] || 0) + 1; save(); status(); ticks(); }
              $$('.opt', o).forEach(function (x) { x.disabled = true; });
              var nx = bt(n + 1 < order.length ? 'Next' : 'Finish', 'go'); nx.style.marginTop = '12px'; box.appendChild(nx); nx.focus();
              nx.addEventListener('click', function () { n++; one(); });
            }
            first = false;
          });
        });
        math(box);
      }
      ticks(); one();
    }

    /* ================================================================ Marker mode
       Whole real scripts, no hints and no rules enforced: the marker decides every scheme line
       (and can change a decision) before comparing with the examiner. */
    var mpanel = $('#p-marker');
    function byOf(s) { return (s.mm && s.mm.by) || (/examiner/i.test(s.kind) ? 'examiner' : 'scheme'); }
    function renderMarkerPicker() {
      var h = '<div class="card"><h2>Marker mode</h2><p class="muted small">Whole real scripts, no hints. Read the script, then decide every mark in the scheme yourself. Nothing is checked until you compare, and you can change any decision before then. ' +
        'Scripts from Cambridge’s Example Candidate Responses come with the real examiner’s marks and comments. The training-pack scripts come without marks, so for those you compare with the published scheme as we applied it.</p>';
      if (!mlist.length) h += '<p class="small muted">No whole scripts for this topic yet.</p>';
      else {
        h += '<div class="pick">';
        mlist.forEach(function (s, i) {
          var b = S.mk[s.id];
          h += '<button type="button" data-i="' + i + '"><span class="t">' + esc(s.mtitle || s.title) + '</span><span class="s">' + esc(byOf(s) === 'examiner' ? 'Real script · examiner’s marks' : 'Real script · scheme marks (ours)') + '</span>' +
            (b != null ? '<span class="d">Best agreement ' + b + '%</span>' : '') + '</button>';
        });
        h += '</div>';
      }
      mpanel.innerHTML = h + '</div>';
      $$('.pick button', mpanel).forEach(function (b) { b.addEventListener('click', function () { playMarker(+b.getAttribute('data-i')); }); });
    }
    function playMarker(mi) {
      var s = mlist[mi], by = byOf(s), mine = s.scheme.map(function () { return undefined; });
      mpanel.innerHTML = '';
      var top = el('div', 'row no-print'); var back = bt('‹ All scripts', 'ghost'); top.appendChild(back); mpanel.appendChild(top);
      back.addEventListener('click', function () { renderMarkerPicker(); mpanel.scrollIntoView({ block: 'start' }); });
      var card = el('div', 'card'); mpanel.appendChild(card);
      card.innerHTML = '<div class="qbox"><span class="src">' + esc(s.mtitle || s.title) + '</span><div class="qt">' + s.q + '</div><div class="mk small">Total: ' + s.marks + ' marks</div></div>' +
        '<div class="sheet"><div class="who">' + esc(s.who) + '</div></div>' +
        '<div class="task"><p class="ask">Mark it: decide every line of the mark scheme.</p><p class="small muted">No hints, and no rules are applied for you. Tap any code to see what it means.</p><div class="ms"></div><div class="tally"></div>' +
        '<div class="row" style="margin-top:12px"><button type="button" class="go" id="mmCompare" disabled>Compare with the examiner</button></div><div class="mmOut"></div></div>';
      var sheet = $('.sheet', card), ms = $('.ms', card), tally = $('.tally', card), cmp = $('#mmCompare'), out = $('.mmOut', card);
      var rows = s.lines.map(function (ln) {
        var r = el('div', 'sl');
        r.innerHTML = '<span class="pt">' + (ln.p || '') + '</span><span class="w">' + ln.t + '</span><span class="mg"></span>';
        sheet.appendChild(r); return r;
      });
      var msRows = s.scheme.map(function (m, j) {
        var r = el('div', 'msl');
        r.innerHTML = '<div class="cd">' + chip(m.c) + '</div><div class="what">' + m.d + '</div><div class="acts" role="group" aria-label="Row ' + (j + 1) + '"></div><div class="res" hidden></div>';
        var acts = $('.acts', r);
        var labels = m.pick ? m.pick : ['Award', 'Withhold'];
        labels.forEach(function (l, i) {
          var b = bt(l, 'ghost'); b.setAttribute('aria-pressed', 'false'); acts.appendChild(b);
          b.addEventListener('click', function () {
            mine[j] = m.pick ? l : i === 0;
            $$('button', acts).forEach(function (x) { var on = x === b; x.setAttribute('aria-pressed', on ? 'true' : 'false'); x.className = on ? 'go' : 'ghost'; });
            upd();
          });
        });
        ms.appendChild(r); return r;
      });
      math(card);
      function upd() {
        var n = mine.filter(function (d) { return d !== undefined; }).length;
        var tot = s.scheme.reduce(function (a, m, j) { return a + val(m, mine[j]); }, 0);
        tally.innerHTML = 'Your total <b>' + tot + '</b> of ' + s.marks + ' · decided ' + n + ' of ' + s.scheme.length;
        cmp.disabled = n < s.scheme.length;
      }
      upd();
      cmp.addEventListener('click', compare);
      function compare() {
        cmp.disabled = true; cmp.parentNode.hidden = true;
        var agree = 0, flags = [];
        s.scheme.forEach(function (m, j) {
          var r = msRows[j], res = $('.res', r), same = mine[j] === m.a;
          if (same) agree++;
          $$('button', $('.acts', r)).forEach(function (x) { x.disabled = true; });
          r.classList.add(same ? 'got' : 'miss');
          var exSays = m.pick ? m.a : (m.a ? 'awarded' : 'withheld');
          res.hidden = false;
          res.innerHTML = '<b>' + (same ? 'Same as the examiner' : 'The examiner: ' + exSays) + '.</b> ' + m.why;
          math(res);
          if (m.on != null && rows[m.on]) {
            var got = val(m, m.a) > 0;
            $('.mg', rows[m.on]).insertAdjacentHTML('beforeend', (got ? '<span class="tick">✓</span>' : '') + chip(m.pick && got ? m.a : m.c, got ? '' : 'lost'));
          }
          if (val(m, mine[j]) > 0) (m.dep || []).forEach(function (d) {
            if (val(s.scheme[d], mine[d]) === 0) flags.push((isGen(m.c) ? 'Row ' + (j + 1) : m.c) + ' was awarded, but ' + (isGen(s.scheme[d].c) ? 'row ' + (d + 1) : s.scheme[d].c) + ', which it depends on, was withheld.');
          });
        });
        var pct = Math.round(100 * agree / s.scheme.length);
        if (S.mk[s.id] == null || pct > S.mk[s.id]) S.mk[s.id] = pct;
        save(); status();
        var yours = s.scheme.reduce(function (a, m, j) { return a + val(m, mine[j]); }, 0);
        var h = '<div class="deb" style="margin-top:14px">' +
          '<div class="say ' + (pct >= 85 ? 'ok' : pct >= 50 ? 'rule' : 'no') + '"><b class="t">You agree with the examiner on ' + agree + ' of ' + s.scheme.length + ' scheme lines (' + pct + '%).</b>' +
          'Your total: ' + yours + ' of ' + s.marks + '. ' + (by === 'examiner' ? 'The examiner’s total' : 'The total under the published scheme') + ': ' + earnedOf(s) + ' of ' + s.marks + '.</div>' +
          (flags.length ? '<div class="say rule"><b class="t">Check the dependencies</b>' + flags.map(esc).join('<br>') + '</div>' : '') +
          '<div><h3>' + (by === 'examiner' ? 'What the examiner said' : 'Notes on this script') + '</h3><p>' + ((s.mm && s.mm.note) || s.note) + '</p></div>' +
          (s.model ? '<div><h3>Model answer</h3>' + modelHTML(s) + '</div>' : '') +
          '<div class="srcline">' + esc(s.credit) + '</div>' +
          '<div class="row no-print"><button type="button" class="go" id="mmAgain">Mark it again</button>' + (mi + 1 < mlist.length ? '<button type="button" class="ghost" id="mmNext">Next script</button>' : '') + '<button type="button" class="ghost" id="mmAll">All scripts</button></div></div>';
        out.innerHTML = h; math(out);
        $('#mmAgain').addEventListener('click', function () { playMarker(mi); mpanel.scrollIntoView({ block: 'start' }); });
        if ($('#mmNext')) $('#mmNext').addEventListener('click', function () { playMarker(mi + 1); mpanel.scrollIntoView({ block: 'start' }); });
        $('#mmAll').addEventListener('click', function () { renderMarkerPicker(); mpanel.scrollIntoView({ block: 'start' }); });
        $('#mmAgain').focus();
      }
    }

    /* ---------- start over ---------- */
    var rs = $('#dReset'), armed = null;
    rs.addEventListener('click', function () {
      if (!armed) { rs.textContent = 'Tap again to clear'; rs.classList.add('armed'); armed = setTimeout(function () { rs.textContent = 'Start over'; rs.classList.remove('armed'); armed = null; }, 4000); return; }
      clearTimeout(armed); armed = null; rs.textContent = 'Start over'; rs.classList.remove('armed');
      S = { best: {}, cc: {}, learned: {}, mk: {}, tab: S.tab };
      try { localStorage.removeItem(KEY); } catch (e) {}
      save(); status(); renderLearn(); renderPicker(); renderCheck(); renderMarkerPicker();
    });

    renderLearn(); renderPicker(); renderCheck(); renderMarkerPicker(); status(); showTab(S.tab);
    window.TIBDesk.state = function () { return S; };
    window.TIBDesk.cfg = cfg;
  }

  window.TIBDesk = { start: start, cards: CARDS, cardFor: cardFor, rankFor: rankFor };
})();
