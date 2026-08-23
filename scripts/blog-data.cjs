// 博客文章数据（生成 public/blog.html 的唯一数据源）
// 新增文章：在此数组**末尾**追加一条（id 用 postN 递增，date 用发布日期 YYYY-MM-DD，zhBody/enBody 为正文 HTML），
// 然后运行: node scripts/build-blog.mjs 重新生成 public/blog.html
// 注意: 显示顺序 = 数组倒序（最新在最上），由 build 脚本自动排。
module.exports = [
  {
    id: 'post10',
    titleKey: 'bl_post10_t',
    title: "屏幕时间 vs 屏幕质量：关键不是小时数",
    enTitle: "Screen Time vs. Screen Quality: It's Not the Hours, It's the Content",
    descKey: 'bl_post10_d',
    desc: "两小时专注工作，比六小时无意识刷屏更有价值——但屏幕时间统计把两者混在一起。这篇教你怎么区分 quality screen time，以及怎么让屏幕时间变\"贵\"。",
    date: '2026-08-11',
    zhBody: `<p>两小时专注工作，比六小时无意识刷屏更有价值——这句废话很多人知道，但屏幕时间统计从不算这笔账。screen quality vs quantity 这件事，比"每天少刷一小时"更值得先想清楚：同样盯着屏幕，质量完全不同。这篇讲讲怎么区分，以及怎么把质量提上去。</p>
          <h3>屏幕时间统计骗了你什么</h3>
          <p>系统里那个"今日屏幕时间 8 小时"的数字，把工作、刷视频、回消息、看地图全混在一起。它回答不了最关键的问题：这 8 小时里，有多少是你主动选择的？两小时专注写作和六小时漫无目的刷短视频，前者是产出，后者是消耗，但统计数字一模一样。</p>
          <p>quality screen time 的判断标准很简单：结束之后，你是觉得充实，还是觉得空虚？工作、学习、创作、和真人视频通话，都属于高质量；被动刷信息流、无意识点开视频、睡前漫无目的地滑动，属于低质量。分类标准不是"屏幕"本身，而是你的意图和状态。</p>
          <h3>质量比数量更影响状态</h3>
          <p>连续刷两小时短视频，和写两小时代码，对多巴胺基线的影响完全不同。低质量屏幕时间制造的是"持续的小奖励"，让大脑保持在随时想刷的状态；高质量屏幕时间则是有明确目标和反馈的投入，结束时有完成感。这也是为什么"每天少刷一小时"经常失败——如果剩下的时间还是低质量，问题没变。</p>
          <p>换一个角度：你不需要把总时长压到某个神奇数字，只需要保证屏幕时间里高质量的部分占多数。对大多数上班族来说，工作本身已经贡献了相当比例的高质量屏幕时间，真正要管的往往是睡前和碎片时段那几段低质量滑动。</p>
          <h3>怎么把屏幕时间变"贵"</h3>
          <ul>
            <li>给每个屏幕时段贴标签：打开手机前问一句"我要干什么"，回答不出的就放下</li>
            <li>把低质量 App 和高质量 App 分开：刷视频的 App 放进深层文件夹，阅读、学习的放首屏</li>
            <li>给无意识刷屏设上限：用 <a href="app.html">PausePaw</a> 这类工具在到点打断，而不是靠"再看一条"的自我谈判</li>
            <li>睡前时段默认高质量：读书、写日记、语音和家人聊天，把"刷"换成有意图的活动</li>
          </ul>
          <p>mindful screen use 的核心不是戒断，是让每次点亮屏幕都带着目的。目标不是"今天只用了两小时"，而是"今天用掉的每一小时都是我想用的"。</p>`,
    enBody: `<p>Two hours of focused work beats six hours of mindless scrolling. Everyone nods at that sentence, and then checks the screen-time stat that treats both the same. Screen quality vs quantity matters more than shaving an hour off the daily total. This post covers how to tell them apart, and how to make your screen time count for more.</p>
          <h3>What the screen-time counter hides</h3>
          <p>The "8 hours of screen time" number mixes work, scrolling, messaging and maps into one lump. It cannot answer the only question that matters: how much of that 8 hours did you actually choose? Two hours of focused writing and six hours of aimless short-video swiping look identical in the stats. One is output, the other is consumption.</p>
          <p>The test for quality screen time is simple: when you finish, do you feel filled up or drained? Work, study, creating, real video calls with people, those are high quality. Passive feeds, autopilot video, late-night swiping with no destination, low quality. The label is not about the screen. It is about your intent and state.</p>
          <h3>Quality moves your baseline more than quantity</h3>
          <p>Two hours of short video and two hours of writing code do very different things to your dopamine baseline. Low-quality screen time hands out constant small rewards and keeps the brain in "maybe something good is coming" mode. High-quality time is goal-directed: clear target, real feedback, a sense of completion at the end. That is why "cut one hour a day" keeps failing. If the remaining time is still low quality, nothing changed.</p>
          <p>Reframe it: you do not need to hit some magic total. You need the high-quality slice of your screen time to be the majority. For most office workers, work already contributes a decent share. The part that actually needs managing is the low-quality sliding in the evenings and the in-between moments.</p>
          <h3>How to make your screen time more expensive</h3>
          <ul>
            <li>Tag every session: before unlocking, ask "what am I about to do?" If no answer comes, put the phone down</li>
            <li>Separate low-quality apps from high-quality ones: bury the video apps in a deep folder, keep reading and learning on the first screen</li>
            <li>Cap the mindless stuff: let a tool like <a href="app.html?lang=en">PausePaw</a> break the loop at the limit instead of negotiating "one more video" with yourself</li>
            <li>Default the pre-bed window to high quality: a paper book, a journal, a voice call with family, anything with intent</li>
          </ul>
          <p>Mindful screen use is not abstinence. It is lighting up the screen on purpose. The goal is not "only two hours today". It is "every hour I used today was an hour I wanted".</p>`,
  },
  {
    id: 'post9',
    titleKey: 'bl_post9_t',
    title: "屏幕时间 3-2-1 法则：睡前、醒后各一次",
    enTitle: "The 3-2-1 Screen Time Rule: Before Bed, After Wake",
    descKey: 'bl_post9_d',
    desc: "3-2-1 法则：睡前 3 小时不碰工作消息，2 小时不碰娱乐内容，1 小时完全不碰手机。怎么落地，以及那些容易破功的坑。",
    date: '2026-08-10',
    zhBody: `<p>3 2 1 rule screen time 是这两年流传最广的屏幕习惯之一，核心只有一句话：睡前 3 小时不碰工作消息，2 小时不碰娱乐内容，1 小时完全不碰手机。它不像"睡前不用手机"那么极端，也不像"随便用"那么放纵，是大多数人能坚持的中间态。这篇讲怎么落地，以及踩过的坑。</p>
          <h3>3-2-1 到底是什么意思</h3>
          <ul>
            <li>睡前 3 小时：不处理工作消息。回邮件、看群聊这种"半清醒"操作，会让大脑持续处于待命状态</li>
            <li>睡前 2 小时：不碰娱乐内容。短视频、剧集、游戏会刺激多巴胺，推迟入睡时间</li>
            <li>睡前 1 小时：手机放远，让眼睛和大脑同时进入放松</li>
          </ul>
          <p>注意这个规则的顺序很重要：它不是让你 3 小时前就上床，而是把"降低刺激"分成三档，逐步过渡。对作息乱的人来说，直接跳到第三档很容易破功，从第一档开始坚持一周，效果反而明显。</p>
          <h3>醒后的 1 小时同样重要</h3>
          <p>多数人只关注睡前，忘了起床后的第一小时。醒来第一件事刷手机，等于把注意力控制权交给算法。3-2-1 法则的变体：起床后 30 分钟不看手机，先把今天最重要的三件事写下来。这个小改动对 morning focus 的提升，比睡前规则更快见效。</p>
          <h3>落地步骤（从今天开始）</h3>
          <ul>
            <li>设两个闹钟：睡前 3 小时和 1 小时的提醒，而不是只设睡眠闹钟</li>
            <li>睡前 1 小时把手机放到卧室外或床头柜抽屉，充电线也收起来</li>
            <li>用实体闹钟代替手机闹钟，切断"手机在床边"的唯一理由</li>
            <li>睡前 2 小时找替代活动：纸质书、拉伸、跟家人聊天，什么都行，就是不碰屏幕</li>
          </ul>
          <p>规则本身很简单，难的是坚持。别指望一天成功，先用一周观察入睡时间的变化。让 <a href="/app.html">PausePaw</a> 在三个时间点提醒你，而不是靠你对自己说"该放下了"。想先理解背后的机制，读读<a href="/blog/post7.html">多巴胺回路</a>那篇，或者从<a href="/blog/post6.html">90 分钟法则</a>开始。</p>`,
    enBody: `<p>The 3 2 1 rule screen time has become one of the most shared screen habits in the last couple of years, and the core is one line: 3 hours before bed, no work messages; 2 hours before bed, no entertainment; 1 hour before bed, no phone at all. It is less extreme than going cold turkey and less loose than "whatever happens happens". It is the middle ground most people can actually keep. This post covers how to make it stick, and the mistakes that break it.</p>
          <h3>What 3-2-1 actually means</h3>
          <ul>
            <li>3 hours before bed: no work messages. Replying to email or skimming group chats keeps your brain on standby</li>
            <li>2 hours before bed: no entertainment. Short videos, shows and games spike dopamine and push sleep later</li>
            <li>1 hour before bed: phone out of reach, eyes and brain both wind down</li>
          </ul>
          <p>The order matters. This is not telling you to get in bed three hours early; it is a three-step ramp down in stimulation. If your schedule is chaotic, jumping straight to step three is a recipe for quitting. Start at step one and hold it for a week; the change shows up faster than you expect.</p>
          <h3>The hour after waking matters too</h3>
          <p>Everyone talks about bedtime and forgets the first hour of the day. Checking the phone right after waking hands your attention to an algorithm. A 3-2-1 variant: no phone for 30 minutes after waking, and write down the three most important things for today first. This little switch improves morning focus faster than any bedtime rule.</p>
          <h3>How to start today</h3>
          <ul>
            <li>Set two alarms: one for 3 hours before bed, one for 1 hour, instead of only a sleep alarm</li>
            <li>At the 1-hour mark, move the phone out of the bedroom or into a drawer, and hide the charging cable too</li>
            <li>Use a physical alarm clock so "the phone needs to be on the nightstand" loses its last excuse</li>
            <li>For the 2-hour window, find a replacement: a paper book, stretching, talking to family. Anything that is not a screen</li>
          </ul>
          <p>The rule is simple; the keeping is not. Give it a week and watch your sleep latency change before judging it. Let <a href="app.html?lang=en">PausePaw</a> remind you at all three checkpoints instead of relying on self-talk. Want the mechanism first? Read the <a href="blog/post7.html?lang=en">dopamine loop post</a>, or start with the <a href="blog/post6.html?lang=en">90-minute rule</a>.</p>`,
  },
  {
    id: 'post8',
    titleKey: 'bl_post8_t',
    title: "无手机小时：每天 1 小时会带来什么变化",
    enTitle: "The Phone-Free Hour: What 1 Hour a Day Changes",
    descKey: 'bl_post8_d',
    desc: "每天留出 1 小时无手机时间，是最简单也最有效的数字健康习惯。为什么 1 小时就够、安排在什么时候、怎么不靠意志力开始。",
    date: '2026-08-09',
    zhBody: `<p>戒手机的口号喊了十年，绝大多数人一个都没戒成。原因很简单：目标太大。这里有个更务实的做法——每天 1 小时无手机时间（phone free hour），不做多，只做一个小时。它小到不会失败，又大到真的有用。这篇说清楚为什么 1 小时就够，以及怎么让自己真的做到。</p>
          <h3>为什么是 1 小时，不是 8 小时</h3>
          <p>神经科学给了一个反直觉的答案：恢复效果不是线性的。多巴胺基线需要的是"一段连续的、没有即时奖励的时间"来复位，而不是总量。刷 7 小时手机再睡一觉，和 1 小时不看手机，对基线的影响完全不同。一次完整的 phone-free time 能让大脑从"随时可能有奖励"的模式切回"现在没有奖励、专注当下"的模式。1 小时刚好足够完成这个切换，又短到不会引发戒断焦虑。</p>
          <ul>
            <li>前 10 分钟：手会痒，这是基线在挣扎，正常</li>
            <li>20-40 分钟：注意力开始落地，能读进去书、想清楚事</li>
            <li>40-60 分钟：进入"无聊但舒服"的状态，这就是目标状态</li>
          </ul>
          <h3>安排在什么时候</h3>
          <p>两个黄金时段：早上醒来后的第一小时，和睡前一小时。早上做，你的一天以"我控制手机"开场而不是"手机控制我"；睡前做，直接对接睡眠质量（90 分钟法则那篇讲过）。如果两个都难，就选通勤或午休，关键是固定成习惯，而不是每天重新谈判。</p>
          <h3>怎么不靠意志力开始</h3>
          <ul>
            <li>把手机放到另一个房间，物理距离比任何设置都管用</li>
            <li>给这个小时配一个固定的活动：晨跑、读书、做饭，让"做什么"不用想</li>
            <li>告诉家人朋友这个时间段，让外部期待帮你守住</li>
            <li>第一天只做 20 分钟，一周后加到 60——先让习惯形成，再谈时长</li>
          </ul>
          <p>最后一步是让工具接管提醒。每天 1 小时的 daily phone break 不需要你记在脑子里，<a href="/app.html">PausePaw</a> 会在到点用可爱的伙伴提醒你放下手机，而不是靠你对自己说"该停了"。想先看数据再决定？读读我们的<a href="/blog/day001.html">2026 年人均屏幕时间</a>，或者从<a href="/blog/post7.html">多巴胺回路</a>那篇理解你为什么会一直刷。</p>`,
    enBody: `<p>People have been shouting "quit your phone" for a decade, and almost nobody quits. The reason is simple: the goal is too big. Here is a more practical version: one phone free hour a day. Nothing more, just one hour. It is small enough not to fail and big enough to actually matter. This post explains why an hour is enough, and how to actually pull it off.</p>
          <h3>Why one hour, not eight</h3>
          <p>The neuroscience answer is counterintuitive: recovery is not linear. Your dopamine baseline needs one continuous stretch with no immediate rewards to reset, not a bigger total. Seven hours of scrolling followed by sleep is not the same as one hour off the phone. A solid phone-free time block switches the brain from "a reward might come at any moment" to "no reward now, focus on the present." An hour is long enough to complete that switch and short enough to avoid withdrawal panic.</p>
          <ul>
            <li>First 10 minutes: your hands itch, that is the baseline fighting back, normal</li>
            <li>20-40 minutes: attention lands, you can read a book or think a thought through</li>
            <li>40-60 minutes: you hit "bored but okay", and that is the goal state</li>
          </ul>
          <h3>When to schedule it</h3>
          <p>Two golden windows: the first hour after waking, and the hour before sleep. In the morning, your day opens with "I control the phone" instead of "the phone controls me." At night, it feeds straight into sleep quality (see the 90-minute rule post). If neither works, pick the commute or lunch break. The point is to make it a fixed habit, not to renegotiate every day.</p>
          <h3>How to start without willpower</h3>
          <ul>
            <li>Put the phone in another room. Physical distance beats every app setting.</li>
            <li>Give the hour a fixed activity: a run, a book, cooking. Do not leave "what to do" open.</li>
            <li>Tell family and friends about the window, so outside expectations help hold it.</li>
            <li>Start with 20 minutes on day one, add to 60 after a week. Form the habit first, then stretch the time.</li>
          </ul>
          <p>Last step: let a tool own the reminder. A daily phone break does not need to live in your head. <a href="app.html?lang=en">PausePaw</a> taps you with a cute companion when the hour ends, instead of relying on you telling yourself "time to stop." Want the data first? Start with our <a href="blog/day001.html?lang=en">2026 average screen time post</a>, or read the <a href="blog/post7.html?lang=en">dopamine loop post</a> to understand why you keep scrolling.</p>`,
  },
  {
    id: 'post7',
    titleKey: 'bl_post7_t',
    title: "屏幕时间如何影响大脑：多巴胺回路拆解",
    enTitle: "How Screen Time Rewires Your Brain: The Dopamine Loop",
    descKey: 'bl_post7_d',
    desc: "为什么手机总是放不下？多巴胺回路是核心机制：每次下拉刷新都是一次小型抽奖。看懂这个回路，你才能用对方法而不是硬扛。",
    date: '2026-08-08',
    zhBody: `<p>手机不是"太好玩"，是设计得让人停不下来。屏幕时间与多巴胺之间的关系，说穿了就一句话：你的大脑把"刷一下"和"可能有惊喜"绑在了一起。每次下拉刷新、每次红点亮起，都是一次抽奖——而抽奖是最难戒的东西。</p>
          <h3>多巴胺回路到底是怎么运作的</h3>
          <p>多巴胺不负责"快乐"，它负责"想要"。研究里它被称为奖赏预测误差信号：当你期待一个奖励、但不确定它什么时候来的时候，多巴胺水平最高。短视频的信息流恰好制造了这种状态——你不知道下一条是什么，所以你会一直划。这不是意志力弱，是神经系统在按它的规则运行。</p>
          <ul>
            <li>不确定的奖励最上瘾：固定给糖不如随机给糖更能让动物一直按杆</li>
            <li>红点和下拉刷新都是"抽奖入口"：每看一次就是一次开奖</li>
            <li>刷得越多，基线越钝：同样一条内容带来的刺激会递减，于是需要刷得更快</li>
          </ul>
          <h3>为什么"知道原理"也停不下来</h3>
          <p>知道多巴胺回路不会让你自动戒掉它，就像知道卡路里不会让你自动减肥。真正的问题在于：手机把"开始刷"的成本降到了零。放在手边、解锁即开、开即沉浸，没有任何一道门让你停下来想一想。所以靠"意识到"没用，要靠"制造摩擦"。</p>
          <h3>三个真正有用的小习惯</h3>
          <ul>
            <li>把短视频 App 从首屏移走，放进一个要滑两下才能找到的文件夹——增加一点点开始成本</li>
            <li>关掉非必要通知，红点就是别人给你装的抽奖机</li>
            <li>给刷屏设一个时间上限，到点由工具打断，而不是靠"再看一条"的自我谈判</li>
          </ul>
          <p>第三点最难，因为你在和最强的回路谈判。让打断不由意志力承担，交给一个中立的提醒者会轻松很多——这也是 <a href="/app.html">PausePaw</a> 存在的原因：到点用可爱的伙伴打断你，而不是靠你对自己说"够了"。先看我们的数据文章（<a href="/blog/day001.html">2026 年人均屏幕时间</a>）了解全貌，再回来用工具落地。</p>`,
    enBody: `<p>Your phone is not "too fun." It is designed to be hard to put down. The relationship between screen time and dopamine comes down to one sentence: your brain has learned that "scroll once" might mean "something great." Every pull-to-refresh, every badge, is a lottery ticket. And lottery tickets are the hardest thing to quit.</p>
          <h3>How the dopamine loop actually works</h3>
          <p>Dopamine is not the pleasure chemical. It is the wanting chemical. In the research it is called reward prediction error: your dopamine spikes when you expect a reward but do not know exactly when it arrives. Short-video feeds manufacture exactly that state. You do not know what is next, so you keep scrolling. That is not weak willpower. That is your nervous system following its own rules.</p>
          <ul>
            <li>Uncertain rewards are the most addictive: random pellets keep animals pressing the lever longer than fixed ones</li>
            <li>Badges and pull-to-refresh are lottery entries: every check is a draw</li>
            <li>The more you scroll, the blunter the baseline: the same hit feels weaker, so you scroll faster</li>
          </ul>
          <h3>Why knowing the science does not stop you</h3>
          <p>Understanding the dopamine loop does not automatically let you beat it, the same way knowing about calories does not make you lose weight. The real problem is that the phone pushes the cost of starting to zero. It sits in your hand, unlocks instantly, and opens straight into the feed. There is no door that makes you pause. Awareness is not the fix. Friction is.</p>
          <h3>Three habits that actually help</h3>
          <ul>
            <li>Move short-video apps off the home screen into a folder two swipes away — add a little cost to starting</li>
            <li>Turn off non-essential notifications; every badge is a slot machine someone installed for you</li>
            <li>Set a hard time limit on scrolling and let a tool interrupt you, instead of negotiating with "just one more"</li>
          </ul>
          <p>That last one is the hardest, because you are negotiating with your strongest loop. It helps enormously when the interruption does not depend on your willpower but comes from a neutral reminder — which is exactly why <a href="app.html?lang=en">PausePaw</a> exists: a cute companion taps you at the limit instead of relying on you telling yourself "enough." Start with the data (see our <a href="blog/day001.html?lang=en">2026 average screen time post</a>) to see the full picture, then come back and let the tool do the heavy lifting.</p>`,
  },
  {
    id: 'post6',
    titleKey: 'bl_post6_t',
    title: "屏幕时间与睡眠：90 分钟法则",
    enTitle: "Screen Time and Sleep: The 90-Minute Rule",
    descKey: 'bl_post6_d',
    desc: "睡前一小时放下手机，比任何助眠 App 都管用。用 90 分钟法则给大脑留出褪黑素分泌时间，不用彻底戒断也能睡得更好。",
    date: '2026-08-07',
    zhBody: `<p>睡前刷手机和睡得差几乎是一对铁搭档。屏幕时间与睡眠之间的关系，比大多数人以为的更直接：手机屏幕的蓝光会抑制褪黑素分泌，把"该困了"的信号往后推。你不是不困，是大脑被屏幕骗了。</p>
          <h3>为什么是 90 分钟</h3>
          <p>研究发现，睡前两小时内接触高亮度屏幕，会让入睡时间平均推迟 10 到 30 分钟，浅睡占比也会增加。90 分钟法则的做法很简单：睡前 90 分钟开始，手机不进卧室，屏幕亮度调低，给褪黑素留出分泌窗口。不需要永远这样，只需要在睡前这段时间做到。</p>
          <ul>
            <li>蓝光抑制褪黑素：屏幕越亮、离眼睛越近，抑制越明显</li>
            <li>内容更伤睡眠：短视频的强刺激让大脑保持兴奋，比光线更难放下</li>
            <li>90 分钟是"够用"的窗口：研究发现 60-90 分钟足够让睡意正常出现</li>
          </ul>
          <h3>怎么落地：从 30 分钟开始</h3>
          <p>一上来就"睡前不用手机"太难，大多数人坚持不过三天。更现实的做法：先定一个睡前 30 分钟无手机，稳定一周后再往前推。手机放在客厅充电，别放在床头，这一步比任何意志力都管用——物理隔离是"晚上不看手机"最靠谱的实现方式。</p>
          <h3>睡前可以做什么</h3>
          <ul>
            <li>纸质书或阅读器（墨水屏），比刷短视频容易入睡</li>
            <li>简单的拉伸或呼吸练习，把节奏放慢</li>
            <li>把明天的待办写下来，清空大脑再睡</li>
            <li>听播客或白噪音，音量放低，设置定时关闭</li>
          </ul>
          <p>如果白天刷手机的时间自己控制不住，睡前这一小时就更守不住。先用 <a href="/app.html">PausePaw</a> 给刷屏设置温柔的上限，到点提醒你停下，睡前无手机才不会是空话。</p>`,
    enBody: `<p>Phone before bed and bad sleep go together like peanut butter and anxiety. The link between screen time and sleep is more direct than most people think: the blue light from your screen suppresses melatonin, pushing the "time to feel sleepy" signal later. You are not staying up because you are not tired. Your brain is being fooled by the screen.</p>
          <h3>Why 90 minutes</h3>
          <p>Studies show that bright screens within two hours of bedtime delay sleep onset by an average of 10 to 30 minutes and increase light-sleep share. The 90-minute rule is simple: starting 90 minutes before bed, the phone stays out of the bedroom and screen brightness goes down, giving melatonin a window to do its job. You do not need to do this forever. Just in that window.</p>
          <ul>
            <li>Blue light suppresses melatonin: brighter screen, closer to your eyes, bigger effect</li>
            <li>Content matters more: short-video feeds keep the brain excited in a way light alone cannot</li>
            <li>60-90 minutes is a workable window: enough for normal sleepiness to return</li>
          </ul>
          <h3>How to start: begin with 30 minutes</h3>
          <p>Going "no phone before bed" overnight is a great way to fail by day three. A more realistic path: commit to 30 phone-free minutes before bed, hold it for a week, then push the boundary back. Charge the phone in the living room, not on the nightstand. That single move does more than willpower ever will — physical distance is the most reliable implementation of "no phone in bed."</p>
          <h3>What to do instead</h3>
          <ul>
            <li>A paper book or e-ink reader — far easier to fall asleep to than short video</li>
            <li>Gentle stretching or breathing, slowing the pace on purpose</li>
            <li>Write tomorrow's to-do list, then let your brain go off duty</li>
            <li>Low-volume podcast or white noise with a sleep timer</li>
          </ul>
          <p>If you cannot control daytime scrolling, you will not hold the line at night either. Let <a href="app.html?lang=en">PausePaw</a> set a gentle cap on mindless browsing first, with a break reminder when you hit the limit. Phone-free evenings stop being a promise and start being a habit.</p>`,
  },
{
    id: 'post5',
    titleKey: 'bl_post5_t',
    title: "娱乐性 vs 生产力屏幕时间：为什么要分开算",
    enTitle: "Recreational vs Productive Screen Time: Why the Split Matters",
    descKey: 'bl_post5_d',
    desc: "大多数\"屏幕时间\"统计把工作和娱乐混在一起，掩盖了真正的问题。把两类分开，你才能看到该砍的是哪一块。",
    date: '2026-08-06',
    zhBody: `<p>系统里显示的"今日屏幕时间 9 小时"几乎没有任何指导意义——因为 6 小时是工作，3 小时是刷短视频。把娱乐性和生产力屏幕时间分开算，是开始管理屏幕的第一步。</p>
          <h3>为什么要分开</h3>
          <ul>
            <li>工作屏幕时间是产出，砍它会伤效率；娱乐屏幕时间才是"可谈判"的部分</li>
            <li>混在一起 → 你会误以为"我一天都在干活"；分开后 → 真相是短视频吞掉一半</li>
            <li>判断标准不同：工作屏幕看"是否专注"，娱乐屏幕看"是否有意识"</li>
          </ul>
          <h3>怎么分</h3>
          <ul>
            <li>iOS：设置 → 屏幕时间 → 按 App 分类看（社交/视频娱乐归娱乐，办公/阅读归生产力）</li>
            <li>Android：设置 → 数字健康 → 同样按类别划分</li>
            <li>简单规则：能产生成果的算生产力，纯粹消费的算娱乐</li>
          </ul>
          <p>分完之后你会立刻看到真相：真正需要管理的往往只有娱乐那一块。给娱乐设个配额，到点让 <a href="app.html">PausePaw</a> 温柔地提醒你停下——不用戒断，只要知道该砍的是哪一块。</p>`,
    enBody: `<p>Your phone says "9 hours of screen time today" — almost meaningless. Six are work, three are doomscrolling. Splitting recreational vs productive screen time is step one of managing screens at all.</p>
          <h3>Why the split matters</h3>
          <ul>
            <li>Work screen time is output; cutting it hurts productivity. Leisure screen time is the negotiable part.</li>
            <li>Lumped together, you think "I worked all day." Split apart, the truth is short video ate half of it.</li>
            <li>Different yardsticks: work screens are judged by focus; leisure screens by awareness.</li>
          </ul>
          <h3>How to split it</h3>
          <ul>
            <li>iOS: Settings → Screen Time → per-app breakdown (social/video = leisure; office/reading = productive)</li>
            <li>Android: Settings → Digital Wellbeing → same categories</li>
            <li>Simple rule: produces output = productive; pure consumption = leisure</li>
          </ul>
          <p>Once split, the truth is obvious: usually only the leisure slice needs managing. Give it a quota and let <a href="app.html?lang=en">PausePaw</a> gently stop you at the limit — no quitting, just knowing which slice to cut.</p>`,
  },
  {
    id: 'post4',
    titleKey: 'bl_post4_t',
    title: "多少屏幕时间算\"太多\"？给个现实点的阈值",
    enTitle: "How Much Screen Time Is Too Much? A Realistic 2026 Threshold",
    descKey: 'bl_post4_d',
    desc: "\"每天两小时\"是上世纪的老建议。2026 年更可靠的判断标准是看信号：睡不好、脖子疼、刷不停、放下就焦虑。这篇给你一套现实可用的自查清单。",
    date: '2026-08-05',
    zhBody: `<p>"每天屏幕时间别超过两小时"——这是 1990 年代的规则，今天几乎没人做得到，拿它当标准只会让人焦虑。真正该看的是<strong>信号</strong>，不是数字。</p>
          <h3>身体信号</h3>
          <ul>
            <li>睡前刷手机 → 入睡困难、睡眠变浅</li>
            <li>脖子/肩膀酸痛 → 长时间低头</li>
            <li>眼睛干涩、频繁揉眼</li>
          </ul>
          <h3>心理信号</h3>
          <ul>
            <li>刷完觉得空虚、愧疚</li>
            <li>放下手机就不安、总想拿起</li>
            <li>工作/学习时忍不住看手机</li>
          </ul>
          <p>如果出现 2-3 个以上，就该调整了——不管屏幕时间数字是多少。减少"坏屏幕时间"的三招：睡前 30-60 分钟放下手机；给娱乐屏幕设配额；用"替代"而不是"戒断"。</p>
          <p>想记录和约束自己的屏幕时间？试试 <a href="app.html">PausePaw</a>——到点就停，可爱不羞辱。</p>`,
    enBody: `<p>"Keep screen time under two hours" is a 1990s rule nobody can meet today. The honest signal-based framework beats any magic number.</p>
          <h3>Physical signals</h3>
          <ul>
            <li>Phone before bed → trouble sleeping</li>
            <li>Neck/shoulder pain from looking down</li>
            <li>Dry, strained eyes</li>
          </ul>
          <h3>Mental signals</h3>
          <ul>
            <li>Feeling empty or guilty after scrolling</li>
            <li>Anxious without the phone</li>
            <li>Checking the phone during work</li>
          </ul>
          <p>Two or more? Time to adjust — regardless of the number. Three fixes: phone-free 30-60 min before bed, a daily leisure-screen quota, and replace (walk/book) instead of quit.</p>
          <p>Track and curb your screen time with <a href="app.html?lang=en">PausePaw</a> — a cute pause beats a cold block.</p>`,
  },
  {
    id: 'day001',
    titleKey: 'bl_day1_t',
    title: "2026 年人均每日屏幕时间：数据说了什么",
    enTitle: "Average Daily Screen Time in 2026: What the Data Says",
    descKey: 'bl_day1_d',
    desc: "2026 年最新数据：各年龄段、各国、各平台的日均屏幕时间是多少？以及这对你意味着什么。",
    date: '2026-08-04',
    zhBody: `<p>如果现在拿起手机，你会想知道今天已经刷了多久吗？如果直觉告诉你"大概太多了"，你并不孤单。2026 年，普通人看屏幕的时间已经超过醒着时做的任何其他事。</p>
          <p><strong>核心数字。</strong>综合 2026 年主流研究，<strong>成年人每天看屏幕 6 小时 40 分钟</strong>，比 2025 年的 6 小时 23 分钟还多；手机占其中约一半。青少年更高——<strong>每天娱乐性屏幕时间平均 8 小时 30 分钟</strong>。作为对比，1980 年代人均约 3 小时/天。40 年，屏幕暴露量翻了一倍。</p>
          <p><strong>时间都花在哪了。</strong>社交媒体 2 小时 17 分；视频流媒体（Netflix、YouTube、TikTok、Twitch）1 小时 58 分；即时通讯与邮件 49 分；普通网页浏览 38 分；游戏 35 分。短视频已经取代长视频，成为最大单一品类。把"社交媒体 + 视频流媒体"加起来，就是<strong>每天 4 小时 15 分</strong>——超过全部屏幕时间的一半。</p>
          <p><strong>国家差异。</strong>不同地区差异巨大：南非 9 小时 24 分、巴西 9 小时 03 分、菲律宾 8 小时 52 分、美国 7 小时 06 分、英国 6 小时 43 分、日本 4 小时 27 分、德国 4 小时 14 分（数据来自 DataReportal、Statista、Rescuetime 的 2026 年汇总）。如果你住在高屏幕时间国家，你大概已经发现：<strong>"时刻在线"的社会压力是真的，光靠意志力不够</strong>。</p>
          <p><strong>手机专属数据。</strong>成年人平均每天拿起手机约 144 次；79% 的人在醒来 10 分钟内就会查看手机；65% 的人在收到通知后 5 分钟内查看。每天少用手机 1 小时，比少看电视 1 小时更有效——因为手机是你拥有的最"打断驱动"的屏幕。</p>
          <p><strong>数据没告诉你的。</strong>分布是偏态的：前 20% 的重度用户占了约一半的时长。而且工作与娱乐的屏幕时间混在同一个数字里。"每天 7 小时"不是对你的宣判，而是起点。真正该问的是：<strong>这里面有多少是我真正想要的？</strong></p>
          <p><strong>拿这个数字怎么办。</strong>打开手机自带工具（iOS：设置 → 屏幕时间；Android：设置 → 数字健康），看上周按 App 分类的日均时长，然后只挑<strong>一个类别</strong>来缩减——社交媒体、短视频或即时通讯。设一个每日上限（比如 60 分钟），然后让工具替你执行：仅靠自我记录，效果很差。</p>
          <p><strong>试试：温柔的强制休息。</strong>如果短视频或社交媒体是你想缩减的类别，<a href="/" data-i18n="cta_start">PausePaw</a> 正是为此而生。在 TikTok、YouTube、X 或 Reddit 刷到会话上限时，一只萌系伙伴会接管屏幕，出现一个不可跳过、但很可爱的倒计时休息。时长由你定——5 分钟、10 分钟、1 小时。执行交给 PausePaw，意志力不需要上场。不用卸载，没有羞辱，也不会在第四天反弹。</p>
          <p>想了解更多？看我们的<a href="blog.html#post3" data-i18n="bl_post3_t">暑期屏幕时间数据</a>，或到<a href="faq.html" data-i18n="f_faq">常见问题</a>了解安装与安全问题。</p>`,
    enBody: `<p>If you picked up your phone right now, would you want to know how many hours you've already spent on it today? If your gut says "probably too many", you're far from alone. In 2026, the average person spends more waking hours looking at a screen than doing almost anything else.</p>
          <p><strong>The headline number.</strong> Across the major 2026 studies, <strong>adults spend 6 hours and 40 minutes per day looking at screens</strong>, up from 6h23m in 2025. Phones account for roughly half. Teens run higher — averaging <strong>8 hours and 30 minutes per day</strong> of recreational screen time. For comparison: people in the 1980s averaged about 3 hours a day. We've roughly doubled screen exposure in 40 years.</p>
          <p><strong>Where the time actually goes.</strong> Social media takes 2h17m; video streaming (Netflix, YouTube, TikTok, Twitch) 1h58m; messaging and email 49m; general web browsing 38m; gaming 35m. Short-form video is now the single biggest category, having overtaken long-form streaming in 2024. Combine social media + video streaming and you're looking at <strong>4 hours and 15 minutes per day</strong> — more than half of all screen time.</p>
          <p><strong>The country breakdown.</strong> Averages vary wildly: South Africa 9h24m, Brazil 9h03m, Philippines 8h52m, United States 7h06m, UK 6h43m, Japan 4h27m, Germany 4h14m (aggregated from DataReportal, Statista, and Rescuetime). If you live in a high-screen-time country, you've probably noticed: <strong>the social pressure to be constantly available is real, and willpower is not enough</strong>.</p>
          <p><strong>The phone-only subset.</strong> Adults pick up their phone roughly 144 times per day; 79% check it within 10 minutes of waking; 65% check within 5 minutes of a notification. Cutting phone time by 1 hour per day beats cutting TV by 1 hour — phones are the most interrupt-driven surface you own.</p>
          <p><strong>What the numbers don't tell you.</strong> Distribution is skewed: the top 20% of users account for roughly half of all hours. And work screen time collapses into the same number as recreation. "7 hours a day" is not a verdict — it's a starting point. Ask instead: <strong>how much of this is what I actually want?</strong></p>
          <p><strong>What to do with this number.</strong> Open your phone's built-in tool (iOS: Settings → Screen Time; Android: Settings → Digital Wellbeing), check last week's average by category, and pick <strong>one category</strong> to shrink — social media, short-form video, or messaging. Pick a daily cap (e.g. 60 minutes). Then let a tool enforce it: tracking alone has a poor track record.</p>
          <p><strong>Try it: gentle, enforced breaks.</strong> If short-form video or social media is your "shrink this" category, <a href="/" data-i18n="cta_start">PausePaw</a> is built for exactly this. When you hit your session limit on TikTok, YouTube, X, or Reddit, a cute buddy takes over the screen with a small, unskippable countdown break. You decide how long — 5 minutes, 10 minutes, an hour. PausePaw handles the enforcement, so willpower doesn't have to. No deletion. No shame. No cold-turkey relapse.</p>
          <p>Want more context? See our <a href="blog.html?lang=en#post3" data-i18n="bl_post3_t">summer screen-time data</a>, or check the <a href="faq.html?lang=en" data-i18n="f_faq">FAQ</a> for install and safety questions.</p>`,
  },
  {
    id: 'post3',
    titleKey: 'bl_post3_t',
    title: "暑期屏幕时间翻倍？用\"Pause\"把控制权拿回来",
    enTitle: "Summer screen time doubles? Take control back with a Pause",
    descKey: 'bl_post3_d',
    desc: "研究显示暑期孩子每日娱乐屏幕时间从 3.8 小时飙到 7.2 小时。与其硬堵，不如用温柔的强制休息打断无意识刷屏——这正是 PausePaw 的\"Pause 之力\"：到点就停，可爱不羞辱，习惯自然松动。",
    date: '2026-07-19',
    zhBody: `<p>每年暑假，家长都会面临同一个难题：孩子一放假，屏幕时间就失控。公开研究显示，学龄儿童每日<strong>娱乐性</strong>屏幕时间会从学期中的约 3.8 小时，飙升到暑期的 7.2 小时——几乎翻倍。硬堵往往引发亲子对抗，而完全放任又让人焦虑。</p>
          <p>PausePaw 的解法是"温柔的强制"：给孩子设备装上插件，对游戏/短视频类站点设置合理的单次时长，到点由萌系伙伴接管屏幕强制休息。<strong>不是没收手机，而是教会身体"到点就停"</strong>。这恰好也是<a href="faq.html" data-i18n="f_faq">家庭版（Family）</a>想解决的核心场景。</p>
          <p>对成年人同样有效。远程办公让人整天泡在通知和社交软件里，用 PausePaw 给 X、YouTube、Reddit 设一个"每 20 分钟喘口气"，专注力会明显回升。更多安装与配置问题，见<a href="faq.html" data-i18n="f_faq">常见问题</a>。</p>`,
    enBody: `<p>Every summer, parents face the same problem: screen time spirals the moment school lets out. Public research shows school-age kids' <strong>recreational</strong> screen time jumps from about 3.8 hours on a school day to 7.2 hours over summer — nearly double. Hard blocking sparks parent-child battles; total free rein fuels anxiety.</p>
          <p>PausePaw's answer is "gentle enforcement": install the extension on the child's device, set reasonable per-session limits on games/short-video sites, and let a cute buddy take over the screen for a forced break at the limit. <strong>It's not confiscating the phone — it's teaching the body to stop on schedule.</strong> That's exactly the core scenario the <a href="faq.html?lang=en" data-i18n="f_faq">Family plan</a> is built for.</p>
          <p>It works for adults too. Remote work keeps you marinated in notifications and social apps; set PausePaw to "breathe every 20 minutes" on X, YouTube, Reddit and focus noticeably improves. For install and setup questions, see the <a href="faq.html?lang=en" data-i18n="f_faq">FAQ</a>.</p>`,
  },
  {
    id: 'post2',
    titleKey: 'bl_post2_t',
    title: "5 分钟法则：用小中断打断无意识刷屏",
    enTitle: "The 5-minute rule: small interruptions break mindless scrolling",
    descKey: 'bl_post2_d',
    desc: "无意识刷屏往往源于习惯回路。一个温柔的强制休息，能打断回路、把控制权交还给你。",
    date: '2026-07-19',
    zhBody: `<p>"无意识刷屏"的本质是习惯回路：打开 App → 自动滑动 → 回过神来半小时过去了。你并不是在"享受"，你只是在跑一个自动化脚本。打断这个脚本，不需要意志力，只需要一个<strong>外部的小中断</strong>。</p>
          <p>这就是"5 分钟法则"的思路：与其指望自己"少刷点"，不如让工具在每 5–10 分钟温柔地强制你喘口气。具体怎么用 PausePaw 落地：</p>
          <ol>
            <li>在<a href="app.html" data-i18n="cta_start">控制台</a>把目标站（如 tiktok.com、youtube.com）加进"要管住的网站"。</li>
            <li>单次可刷时长设为 5 分钟（演示可设秒级），强制休息 30 秒到 1 分钟。</li>
            <li>插件加载后，到点弹出一个不可跳过、但很可爱的休息遮罩——时间到自动消失。</li>
          </ol>
          <p>研究表明，哪怕只是 30 秒的停顿，也足以让前额叶重新接管决策，把你从"自动驾驶"拉回"有意识"状态。搭配<a href="blog.html#post3" data-i18n="bl_post3_t">暑期屏幕时间</a>的数据看，效果更明显。</p>`,
    enBody: `<p>"Mindless scrolling" is fundamentally a habit loop: open the app → auto-swipe → realize half an hour vanished. You're not enjoying it — you're running an autopilot script. Breaking that script doesn't require willpower; it requires <strong>one small external interruption</strong>.</p>
          <p>That's the thinking behind the 5-minute rule: instead of hoping you'll "scroll less", let a tool gently force a breather every 5–10 minutes. How to set it up with PausePaw:</p>
          <ol>
            <li>In the <a href="app.html" data-i18n="cta_start">dashboard</a>, add targets (e.g. tiktok.com, youtube.com) to "Sites to manage".</li>
            <li>Set max session time to 5 minutes (or seconds in demo mode), forced break 30s–1min.</li>
            <li>Once the extension loads, an unskippable but cute break overlay appears at the limit — and fades out on its own.</li>
          </ol>
          <p>Research suggests even a 30-second pause is enough for your prefrontal cortex to retake control, pulling you from autopilot back to awareness. Pair it with the <a href="blog.html?lang=en#post3" data-i18n="bl_post3_t">summer screen-time</a> data for even clearer results.</p>`,
  },
  {
    id: 'post1',
    titleKey: 'bl_post1_t',
    title: "为什么“可爱”比“封锁”更有效",
    enTitle: "Why “cute” beats “blocked”",
    descKey: 'bl_post1_d',
    desc: "冷冰冰的“已屏蔽”容易激起逆反；一只会卖萌的伙伴降低了心理抵触，让人更愿意配合休息。",
    date: '2026-07-19',
    zhBody: `<p>大多数屏幕时间工具走的是"对抗路线"：系统弹窗说"已屏蔽"，家长模式直接锁死应用，Freedom 类工具把网站拉黑。问题在于——<strong>被强制剥夺控制权会激活人的逆反心理</strong>。一旦抵触产生，卸载、绕开、改设置就成了本能反应。这也是为什么纯"封锁型"工具卸载率居高不下。</p>
          <p>PausePaw 选择另一条路：当你的刷屏时间到达阈值，一只萌系伙伴会温柔地接管屏幕，配上一个不可跳过的倒计时休息。它不是在"惩罚"你，而是在"陪伴"你停下来。这种低抵触的设计有三个真实好处：</p>
          <ul>
            <li><strong>降低心理防御</strong>：可爱的中断比冷冰冰的"Blocked"更容易被接受，你不会下意识想把它关掉。</li>
            <li><strong>把控制权还给你</strong>：休息结束自动淡出，没有羞辱、没有说教，你只是"被提醒了一下"。</li>
            <li><strong>习惯自然松动</strong>：一次温柔的中断，打断的是无意识刷屏的习惯回路，而不是你和工具的关系。</li>
          </ul>
          <p>想了解怎么把这种"小中断"用在日常生活中？看我们的<a href="blog.html#post2" data-i18n="bl_post2_t">《5 分钟法则》</a>，或者直接去<a href="faq.html" data-i18n="f_faq">常见问题</a>了解安装方式。</p>`,
    enBody: `<p>Most screen-time tools take an adversarial route: a system popup says "Blocked", parental controls hard-lock apps, and Freedom-style tools blacklist websites. The problem is that <strong>having control taken away triggers psychological reactance</strong> — the moment resistance kicks in, uninstalling or working around the tool becomes second nature. That's why pure "blocking" tools suffer high churn.</p>
          <p>PausePaw takes a different path: when your scroll time hits the limit, a cute buddy gently takes over the screen with an unskippable countdown break. It isn't punishing you — it's keeping you company while you pause. This low-resistance design has three real benefits:</p>
          <ul>
            <li><strong>Lower psychological defense</strong>: a cute interruption is far easier to accept than a cold "Blocked" screen, so you don't instinctively want to kill it.</li>
            <li><strong>Gives control back to you</strong>: the break fades out automatically — no shaming, no lecturing, just a gentle nudge.</li>
            <li><strong>Habits loosen naturally</strong>: one gentle interruption breaks the mindless-scrolling loop, not your relationship with the tool.</li>
          </ul>
          <p>Want to use small interruptions in daily life? Read our <a href="blog.html?lang=en#post2" data-i18n="bl_post2_t">5-minute rule</a>, or head to the <a href="faq.html?lang=en" data-i18n="f_faq">FAQ</a> to learn how to install.</p>`,
  },

  , {
    id: 'post21',
    titleKey: 'bl_post21_t',
    title: "30 天不刷社交媒体，大脑会怎样",
    enTitle: "What Happens to Your Brain When You Quit Social Media for 30 Days",
    descKey: 'bl_post21_d',
    desc: "30 天不刷社交媒体后，你的注意力、睡眠和情绪会如何变化？科学解释 + 我的亲身经历。",
    date: '2026-08-24',
    zhBody: `<p>三周前，我从手机里删掉了 Instagram、Twitter 和 TikTok。不是因为我讨厌它们——我爱它们。我爱那种无尽的滚动，那些通知，那种感觉自己与某个比我周围更大的世界相连的感觉。</p>
          <p>但有什么不对劲。我每天查看手机 87 次。我的注意力持续时间缩短到了大约 8 秒——比金鱼还短。我无法读完一本书而不伸手去拿手机。我的睡眠很糟糕。我无法解释为什么。</p>
          <h3>第一周：戒断</h3>
          <p>前三天很残酷。我醒来习惯性地去拿手机。我的拇指在 Instagram 曾经存在的空空间中滚动。我感到焦虑、无聊，与这个世界奇怪地脱节。</p>
          <h3>第二周：重置</h3>
          <p>到了第五天，焦虑开始消退。我注意到我睡得更好了。我的头痛消失了。我在对话中更加在场。</p>
          <h3>第三四周：新常态</h3>
          <p>到第三周，我不再想念社交媒体。查看的冲动消退到了低语。我用更健康的东西替换了这个习惯：晨走、阅读、面对面交谈。</p>
          <h3>科学怎么说</h3>
          <p>宾夕法尼亚大学的一项研究发现，将社交媒体使用限制在每天 30 分钟显著减少了孤独感和抑郁。</p>
          <p><a href="app.html">PausePaw</a> 帮助你建立更健康的关系——不是通过封锁，而是通过温柔的中断。</p>`,
    enBody: `<p>Three weeks ago, I deleted Instagram, Twitter, and TikTok from my phone. Not because I hated them — I loved them. I loved the endless scroll, the notifications, the sense that I was connected to something bigger than my immediate surroundings.</p>
          <p>But something felt off. I was checking my phone 87 times a day. My attention span had shrunk to about 8 seconds — less than a goldfish. I couldn't read a book without reaching for my phone. My sleep was terrible. And I couldn't explain why.</p>
          <h3>Week 1: The Withdrawal</h3>
          <p>The first three days were brutal. I woke up and reached for my phone out of habit. My thumb scrolled through empty space where Instagram used to be. I felt anxious, bored, and strangely disconnected from the world.</p>
          <h3>Week 2: The Reset</h3>
          <p>By day 5, the anxiety started to fade. I noticed I was sleeping better. My headaches disappeared. I was more present in conversations. But I still felt like something was missing.</p>
          <h3>Week 3-4: The New Normal</h3>
          <p>By the third week, I didn't miss social media. The urge to check had faded to a whisper. I had replaced the habit with something healthier: morning walks, reading, face-to-face conversations.</p>
          <h3>What the Science Says</h3>
          <p>A study from the University of Pennsylvania found that limiting social media use to 30 minutes per day significantly reduced loneliness and depression.</p>
          <p><a href="app.html?lang=en">PausePaw</a> helps you build a healthier relationship — not by blocking, but by gentle interruptions.</p>`,
  }
];



// 顺序：显示时最新在前（倒序）
module.exports.displayOrder = [...module.exports].reverse();