import LOGO from "../image/LOGO.png";
import Main from './COLOR_CHANGE.jsx';
import Clock from "./Clock.jsx";
import Timer from './Clock.jsx';
import SpacePlan from "./Space_plan.jsx";
import AddingMethods from "./Writing.jsx";
import { useState, useEffect } from "react";

export const images = import.meta.glob("../image/*.{png,jpg,jpeg,webp,gif,svg,mp4,mp3}", { eager: true });
/*return an object of file */
export const imageFiles = Object.entries(images).map(([path, module]) => ({
  path,
  url: module.default
}));
/*convert it back to another form of object */

export function image_importor(name, type = "image") {
  const found = imageFiles.find(file => file.path.includes(name));
  if (!found) {
    console.warn(`Image not found: ${name}`);
    return { src : name,
             format : type
    };
  }
  else{
  return {src : found.url,
          format : type
  }
}
}

/*async function image_selector(url_of_image, format='.svg'){
  const imported_img = await import(`../image/${url_of_image}${format}`);

  console.log(`../image/${url_of_image}${format}`)

  return imported_img.default;
}*/
  

/*THE 2 CLASS */
class TypeOfTips {
  constructor(type, introduction, list, additional_material = null) {
    this._type = type;
    this._list = list;
    this._introduction = introduction;
    this._additional_material = additional_material;
  }
  get type() {
    return this._type;
  }
  get list() {
    return this._list;
  }
  get introduction(){
    return this._introduction
  }
  get additional_material(){
    return this._additional_material;
  };
}

/*change img into asset */
export class DetailOfTips{
  constructor(header = "header", paragraph = "p", asset = image_importor("LOGO", "image"), side="right", more_info= false, audio = false){
    this._header = header;
    this._paragraph = paragraph;
    this._asset = asset;
    this._side = side;
    this._more_info =more_info;
    this._audio = audio
  }
  get header(){
    return this._header;
  }
  get paragraph(){
    return this._paragraph;
  }
  get asset(){
    return this._asset;
  }
  get side(){
    return this._side;
  }
  get more_info(){
    return this._more_info;
  }
  get audio(){
    return this._audio
  }
}

function CITATE(props){
  const cite = "¹ ² ³ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹ ¹⁰";
  let num = "";
  switch(props.n){
    case "1": num = "¹";break;
    case "2": num = "²";break;
    case "3": num = "³";break;
    case "4": num = "⁴";break;
    case "5": num = "⁵";break;
    case "6": num = "⁶";break;
    case "7": num = "⁷";break;
    case "8": num = "⁸";break;
    case "9": num = "⁹";break;
    case "10": num = "¹⁰";break;
    case "11": num = "¹¹";break;
    case "12": num = "¹²";break;
    case "13": num = "¹³";break;
    case "14": num = "¹⁴";break;
    case "15": num = "¹⁵";break;
    case "16": num = "¹⁶";break;
    case "17": num = "¹⁷";break;
    case "18": num = "¹⁸";break;
    case "19": num = "¹⁹";break;
    case "20": num = "²⁰";break;
    case "21": num = "²¹";break;
    case "22": num = "²²";break;
    case "23": num = "²³";break;
    case "24": num = "²⁴";break;
    case "25": num = "²⁵";break;
    case "26": num = "²⁶";break;
    case "27": num = "²⁷";break;
    case "28": num = "²⁸";break;
    case "29": num = "²⁹";break;

    
    default : num = props.num;
  }
  return(
    <a href={props.src} target="_blank" className="cite">({num})</a>
  )
}

let user_list
let raw_object_user_list = [];

try {
  const parsed = JSON.parse(localStorage.getItem("user_lists") || "[]");
  raw_object_user_list = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
} catch {
  raw_object_user_list = [];
  localStorage.setItem("user_lists", "[]");
}

if(raw_object_user_list){
  user_list = raw_object_user_list.map((object, index) => {

    function deleteUserTip(){
      const raw = JSON.parse(localStorage.getItem("user_lists") || "[]").filter(Boolean)

      raw.splice(index, 1)

      localStorage.setItem("user_lists", JSON.stringify(raw))

      window.location.reload()
    }

    return new DetailOfTips(
      object._header,
      {
        eng: (
          <>
            {object._paragraph.eng}
            <button className="x-button" onClick={() => deleteUserTip(index)}><img src={image_importor("xaxon").src}></img></button>
          </>
        ),
        vn: (
          <>
            {object._paragraph.vn}
            <button className="x-button" onClick={() => deleteUserTip(index)}><img src={image_importor("xaxon").src}></img></button>
          </>
        ),
      },
      object._asset,
      (index % 2=== 0)? "right" : "left",
      false,
      false
    );
  })}
else{
  user_list = [];
}




/*=======================================DATA BASE=================================================*/

const Prime_question = new DetailOfTips(
  {
    eng: "Prime question",
    vn: "Câu hỏi đầu",
    src : image_importor("fish").src
  }  ,
  {
    eng: <>
    determine the importance of it (what is it? The topic, the unit, the subject?) 
    to yourself by asking how will this 
    help me? The more important something
    is, the more attention you should pay to it.
    You can write it (what is it? alternative questions or your answers to those questions) down by pressing <u>more-info</u>
  </>,
  vn: <>
    Xác định tầm quan trọng của việc này
    với cách tự hỏi: “Cái này sẽ
    giúp mình điều gì?”. Việc gì càng quan trọng
    thì bạn càng tự nhiên tập trung vào nó.
    Bước nhỏ này giống như soi lại để nhắc não:
    chuyện này <b>thật sự</b> quan trọng với mình.
    </>,
  },
  image_importor("brain.svg"),
  "left",
  <>
    <label for="prime-question">What question?</label><br/>
    <textarea name="prime-question" placeholder="What knowledge does this give me?, How much effort do I need to put in?, What is the hardest thing I need to learn?"></textarea>
  </>
)

const Promodoro = new DetailOfTips(
  {
    eng: "Pomodoro technique",
    vn: "Kỹ thuật Pomodoro",
    src : image_importor("fish").src
  },
  {
  eng: <>
    This is a time management tool that helps you
    manage your task, <br/>
    step 1: identify the tasks that need to be done<br/>
    step 2: set a 25-minute timer<br/>
    step 3: focus on finishing the tasks<br/>
    step 4: after the focus timer runs out, take a 5 -minutes timed rest<br/>
    step 5: repeat step1,2,3,4 four times then rest for 15-30 minutes and repeat the whole process..<CITATE n="14" src="https://pmc.ncbi.nlm.nih.gov/articles/PMC12532815/"/>
    </>,
  vn: <>
    Bước 1: Chọn một công việc cần hoàn thành.
    Bước 2: Đặt đồng hồ trong 25 phút. <br/>
    Bước 3: Tập trung hoàn toàn vào công việc cho đến khi chuông reo.<br/>
    Bước 4: Nghỉ giải lao ngắn trong 5 phút.<br/>
    Bước 5: Sau mỗi 4 lần nghỉ ngắn, hãy nghỉ một quãng dài từ 15–30 phút.<CITATE n="14" src="https://pmc.ncbi.nlm.nih.gov/articles/PMC12532815/"/>
  </>
  },
  image_importor(<Clock/>, ""),
  "left",
  <iframe  src="https://www.youtube.com/embed/g619AwxdJnY?si=1cUd1y1VmFJ-R11I" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
)

const Everything_in_1_place = new DetailOfTips(
  {
    eng: "Everything in 1 place",
    vn: "Mọi thứ một chỗ",
    src : image_importor("whale").src
  },
  {
    eng: 
    <>
    free up your mind by putting everything you
    need in 1 place, Moreover you would notice (what?) (what still needs doing )
    easier and get it done, and edulience offer
    <a
      href="https://zerotheboro.github.io/KINGSTON/"
      target="_blank"
    >
      BOXITO
    </a>{" "}
    can help u achieve that for free in the your opinion section
    </>,
    vn: <>
    Giải phóng bớt dung lượng cho não bằng cách
    gom tất cả những gì bạn cần vào <b>một chỗ</b>.
    Như vậy bạn sẽ dễ nhìn thấy hơn, ít quên hơn
    và dễ bắt tay vào làm. Công cụ{" "}
    <a
      href="https://zerotheboro.github.io/KINGSTON/"
      target="_blank"
    >
      BOXITO
    </a>{" "}
    có thể giúp bạn làm việc này và edulience cho bạn thử nó miễn phí
    </>
  },
  image_importor("BOXITO"),
  "right"
)

const Auto_google = new DetailOfTips(
  {
    eng: "AUTO GOOGLE",
    vn: "mở tab tự động",
    src : image_importor("fish").src
  },
  {
    eng: 
    <>
    This feature auto open the tabs
    you want to learn right away.
    Click{" "}
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText("chrome://settings/onStartup");
      }}
    >
      link
    </button>{" "}
    to copy & paste
    or follow the tutorial below.
  </>,
  vn: <>
    Tính năng này giúp tự động mở sẵn những tab
    bạn cần học mỗi khi bật trình duyệt.
    Bấm nút <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText("chrome://settings/onStartup");
      }}
    ></button> để copy đường dẫn dán vào Chrome
    rồi cài đặt. Như vậy, mỗi lần mở máy là bạn thấy ngay
    những thứ cần học, đỡ mất công tìm lại từ đầu.
  </>
  },
  
  image_importor("google", "video"),
  "",
  false,
  image_importor("auto_goggle")
)

const Water_ur_face_body = new DetailOfTips(
  {
    eng: "WATER ur face/body",
    vn: "nước & nước",
    src : image_importor("fish").src
  },
  {
    eng:
    <>
    Drink around a glass of water (2 promodoro intervals)
    and splash water onto your face to wake
    your mind! (keep yourself alert)
    </>,
    vn:
    <>
      Uống khoảng một ly nước và té nước lên mặt
      hoặc cơ thể để đánh thức cơ thể dậy.
      Cơ thể tỉnh thì não mới dễ bật chế độ tập trung.
    </>
  },
  image_importor("water"),
  "left"
)

const Strooper_effect = new DetailOfTips(
  {
    eng: "Strooper effect",
    vn: "Bài Strooper",
    src : image_importor("fish").src
  },
  {
    eng:
    <>
      this is a brain training excercise<CITATE n="3" src="https://www.apa.org/research-practice/conduct-research/stroop-effect#:~:text=Despite%20the%20slow%20start%2C%20Stroop,invaluable%20tool%20for%20exploring%20cognition."/> that 
      trains the brain to handle disordered
      information, which  involvesis contradictions between the color seen and text.
      Instruction: <br/>
      1. Press button<br/>
      2. Read the color and not the text.

  </>,
  vn:
  <>
    Đây là 1 bài khởi động cho 
    bộ não<CITATE n="3" src="https://www.apa.org/research-practice/conduct-research/stroop-effect#:~:text=Despite%20the%20slow%20start%2C%20Stroop,invaluable%20tool%20for%20exploring%20cognition."/> cách sắp xếp thong tin mâu thuẫn
    với nhau được chứng minh bỡi tiến sĩ Strooper.
    bước 1: nhấn nút<br/>
    bước 2: đọc cái màu của chữ
  </>
  },
  image_importor(<Main/>, ""),
  "left", 
  false,
  image_importor("strooper_audio")
)

const Break_not_distraction = new DetailOfTips(
  {
    eng: "Incubation effect",
    vn: "Suy nghĩ lúc nghỉ",
    src : image_importor("fish").src
  },
  {eng:
  <>
    a psychological phenomenon where stepping
    away after trying to solve a difficult problem often by taking
    a break or "sleeping on it" leads to a sudden,
    creative solution<CITATE n="16" src="https://psycnet.apa.org/doiLanding?doi=10.1037%2Fa0014212"/>
  </>,
  vn:
  <>
    
  </>},
  image_importor("relaxing_cat"),
  "right"
)

const Short_workout = new DetailOfTips(
  {
    eng: "Short workout",
    vn: "Vận động nhẹ",
    src : image_importor("fish").src
  },
  {
    eng:
    <>
      doing a short workout before studying
      gives your brain the oxygen it needs.
      It can be simple like stretching, pushups, or situps.
    </>,
    vn:
    <>
      Trước khi học, hãy vận động nhẹ một chút
      (vươn vai, chống đẩy, gập bụng,…). Điều này giúp
      máu lưu thông tốt hơn, đưa nhiều oxy lên não,
      làm bạn tỉnh táo và tập trung hơn.
    </>
  },
  image_importor("dumbell"),
  "left"
)

const Long_term_workout = new DetailOfTips(
  {
    eng: "long-term workout",
    vn: "Vận động lâu dài",
    src : image_importor("whale").src
  },
  {
    eng:
    <>
      studies by Stanford, Southern California<CITATE n="1" src="https://lifestylemedicine.stanford.edu/exercise-better-grades/"/>
      showed that excercising regularly
      grows your hippocampus: the part of the brain 
      associated with learning! Because of that 
      edulience offers 1 month free trial of California gym
    claim it the "your opinion" section
  </>,
    vn:
    <>
      nghiên cứu ở Standford and Nam California<CITATE n="1" src="https://lifestylemedicine.stanford.edu/exercise-better-grades/"/>
      gợi ý rằng tập thể dục thường xuyên giúp
      não bộ lớn và vì vậy Edulience sẽ tặng bạn
      1 tháng tập ở California gym nhận nó ở phần
      ý kiến của bạn 
  </>
  },
  image_importor("dumbell"),
)

const Structure_your_day = new DetailOfTips(
  {
    eng: "Structure your day",
    vn: "Lên khung ngày của bạn",
    src : image_importor("whale").src
  },
  {
    eng:
    <>
      The brain loves certainty, structuring your time reduces  saves you the mental energy of deciding what to do next
    </>,
    vn:
    <>
      Não rất thích sự rõ ràng. Khi bạn sắp xếp trước
    mình sẽ làm gì – lúc nào – trong bao lâu, bạn giảm
    được rất nhiều “ma sát” khi phải quyết định tiếp theo
    làm gì. Ít phân vân → nhiều năng lượng hơn để học.
  </>},
  image_importor("multiple_checkbox"),
)

const Premacks_principle = new DetailOfTips(
  {
    eng: "Premack's principle",
    vn: "Nguyên lý Premack",
    src : image_importor("whale").src
  },
  {
    eng:
    <>
      Find the thing you love to do and do it last,
      this gives u the urge to finish everything
      in order to do the thing you want to do. <CITATE n="10" src="https://www.simplypsychology.org/premack-principle.html"/>
    </>,
    vn:
    <>
      Tìm thứ bạn thích làm nhất (xem phim, chơi game,
      nghe nhạc…) và đặt nó ở <b>cuối danh sách</b>.
      Bạn sẽ có thêm động lực tự nhiên để hoàn thành
      những việc cần làm trước để “mở khoá” phần thưởng đó.<CITATE n="10" src="https://www.simplypsychology.org/premack-principle.html"/>
    </>
  },
  image_importor("pirate_map"),
  "left",
  <>
    <label for="need">The task you need to do before:</label><br/>
    <textarea name="need" placeholder="Study algrebra"/><br/>

    <label for="love">The task you love to do after:</label><br/>
    <textarea name="love" placeholder="Relax on social media"/><br/>
  </>
  
)

const Track_progress = new DetailOfTips(
  {
    eng: "Track progress",
    vn: "Theo dõi tiến trình",
    src : image_importor("fish").src
  },
  {
    eng:
    <>
      This will motivate you and remind you how much progress you have made.
    </>,
    vn:
    <>
      Ghi lại bạn đã học được gì, bao nhiêu, trong bao lâu.
    Điều này vừa tạo động lực (thấy mình đi được khá xa),
    vừa giúp bạn biết chỗ nào cần điều chỉnh.
    </>
  },
  image_importor("checkbox"),
  "right"
)

const Brain_diet = new DetailOfTips(
  {
    eng: "BRAIN DIET",
    vn: "Chế độ não ăn ",
    src : image_importor("whale").src
  },
  {eng:<>
    + Omega-3 from fish Fatty fish (salmon, cod)<br/>
    + Leafty vegetables (kale, spinach and broccoli)<br/>
    + Berries (strawberries, blueberries)<br/>
    + Walnuts (Avocado,Walnuts)<br/> suggested from Havard<CITATE src="https://www.health.harvard.edu/healthbeat/foods-linked-to-better-brainpower" n="2"></CITATE>
  </>,
  vn:<>
    + Omega-3 từ cá, đặc biệt là các loại cá béo (cá hồi, cá tuyết) <br/>
    + Rau lá xanh (cải xoăn, rau bina và bông cải xanh)<br/>
    + Các loại quả mọng (dâu tây, việt quất)<br/>
    + Quả óc chó (bơ, óc chó)<br/>
    nghiên cứu từ Havard<CITATE src="https://www.health.harvard.edu/healthbeat/foods-linked-to-better-brainpower" n="2"></CITATE>
  </>},
  image_importor("chicken"),
  "left",
  <iframe src="https://www.youtube.com/embed/btXIAqMSLaI?si=3kt0H28IhoPyIWlm" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
)

const Incubation_effect = new DetailOfTips(
  {
    eng: "Incubation effect",
    vn: "Suy nghĩ lúc nghỉ",
    src : image_importor("fish").src
  },
  {eng:
  <>
    a psychological phenomenon where stepping
    away from tryin to solve a difficult problem—often by taking
    a break or "sleeping on it"—leads to a sudden,
    creative solution<CITATE n="16" src="https://psycnet.apa.org/doiLanding?doi=10.1037%2Fa0014212"/>
  </>,
  vn:
  <>
    
  </>},
)

const Summary_and_print_pre = new DetailOfTips(
  {
    eng: "summary & print",
    vn: "Tóm tắt & in ra",
    src : image_importor("fish").src
  },
  {eng:
  <>
    This is a google doc that 
     you can print that has all the tips,
     in more detail with evidence{" "}
    <a
      href="https://docs.google.com/document/d/1qfUi1f6OYUYhAAmggj1jGT7vZiK1PzGi_ZmotVSADTo/edit?usp=sharing"
      target="_blank"
    >
      <button>THE GG DOC</button>
    </a>
  </>,
  vn:
  <>
    Đây là file <a
      href="https://docs.google.com/document/d/1qfUi1f6OYUYhAAmggj1jGT7vZiK1PzGi_ZmotVSADTo/edit?usp=sharing"
      target="_blank"
    >
      <button>THE GG DOC</button>
    </a> giúp bạn in toàn bộ
    các mẹo, kèm giải thích chi tiết hơn và dẫn chứng.
  </>},
)


/*===========================META-LEARN=================================*/


const Header_first = new DetailOfTips(
  {
    eng: "HEADER first",
    vn: "Tiêu đề trước",
    src : image_importor("fish").src
  },
  {eng:
    <>
      We usually forget about it,
      but reading and trying to predict 
      the topic content it aids you in getting
      the overall idea of the topic better and you can pratice it
      at the more-info section.
    </>,
    vn:
    <>
    Thường chúng ta lướt qua tiêu đề rất nhanh,
    nhưng đọc kỹ tiêu đề trước giúp não có khung tổng quan.
    Khi đã có “khung”, nội dung chi tiết sẽ dễ được gắn kết
    và hiểu sâu hơn, và bạn có thể luyện nó ở phần more-info.
  </>}
)

const Peripheral_vision = new DetailOfTips(
  {
    eng: "peripheral vision",
    vn: "kỹ năng đọc rộng",
    src : image_importor("whale").src
  },
  {eng:
    <>
      Train your eyes to 
      collect info quick, send to the brain by games
      like <a href="https://schultetable.web.app" target="_blank"><button>Schutle table</button></a> or my strooper game in the pre-learn section or <a href="https://en.wikipedia.org/wiki/Brock_string" target="_blank"><button>Brock string</button></a>
    </>,
    vn:
    <>
    Việc đọc nhanh rất tuyệt vời và 
    bạn có thể luyện nó bằng phương pháp
    <a href="https://schultetable.web.app" target="_blank"><button>Schutle table</button></a> 
    và<a href="https://en.wikipedia.org/wiki/Brock_string" target="_blank"><button>Brock string</button></a>
     hoặc dùng bài Strooper ở PRE-LEARN.
  </>},
  image_importor("eye"),
  "left",
  <iframe src="https://www.youtube.com/embed/PdI3fJTzK3g?si=ZB17BI2g_3XT7zcT" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
)

const Use_a_pointer = new DetailOfTips(
  {
    eng: "Use a pointer",
    vn: "Dùng 'con trỏ'",
    src : image_importor("fish").src
  },
  {eng:
    <>
      Use your pointer finger or a ruler...
      to track your reading allowing continuity
      which saves time. In addition, there are 2 ways your fingers
      can be used as a pointer in the "more-info" section. <CITATE n="13" src="https://rdcu.be/flj2r"/>
    </>,
    vn:
    <>
    Dùng ngón tay, bút hoặc thước để đi theo dòng chữ khi đọc.
    Điều này giúp mắt bám theo tốt hơn, hạn chế nhảy dòng,
    giảm thời gian phải tìm lại chỗ đang đọc dở. <CITATE n="13" src="https://rdcu.be/flj2r"/>
  </> 
  },
  
  image_importor("book_pointer"),
  "right"
)

const Spaced_learning = new DetailOfTips(
  {
    eng: "spaced learning",
    vn: "học cách đều",
    src : image_importor("whale").src
  },
  {
    eng:
  <>
    This method is about <b>spreading reviewing time</b>,
    after you have learnt your lessons, you review it again the following day
    the next time is 2 days later and then 4 days later and so on.<br/>
    This allows you to study for the same amount of time with better results. 
    The more info section will help you plan your review session.<CITATE n="9" src="https://www.cureus.com/articles/81442-evidence-of-the-spacing-effect-and-influences-on-perceptions-of-learning-and-science-curricula#!/"/> <CITATE n="12" src="https://files.eric.ed.gov/fulltext/EJ1313692.pdf"/>
  </>,
  vn: 
  <>
    Phương pháp này giúp giãn cách thời gian ôn tập. 
    Sau khi học xong bài, bạn sẽ ôn lại vào ngày mai, 
    lần kế tiếp là sau 2 ngày, rồi 4 ngày, và cứ tiếp tục như vậy.
    Cách này giúp bạn đạt kết quả cao hơn dù tốn cùng một lượng thời gian học. 
    Phần 'thông tin thêm' sẽ giúp bạn lập kế hoạch cho thời gian ôn tập của mình.<CITATE n="9" src="https://www.cureus.com/articles/81442-evidence-of-the-spacing-effect-and-influences-on-perceptions-of-learning-and-science-curricula#!/"/> <CITATE n="12" src="https://files.eric.ed.gov/fulltext/EJ1313692.pdf"/>
  </> 
  },
  image_importor("space-learn"),
  "left",
  <>
    <SpacePlan/>
    <iframe src="https://www.youtube.com/embed/UviQTOdUJEw?si=_ETlIQS9r-fguhCu" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
  </>
)

const Einstein_framework = new DetailOfTips(
  {
    eng: "Einstein framework",
    vn: "Khung Einstein",
    src : image_importor("whale").src
  },
  {eng:
    <>
      Albert Einstein used to say "don't memorize 
      something that can be looked up" and that could
      be writing down your learning methods at the 
      your-methods session.
    </>,
    vn:
    <>
    Đừng nhớ công thức khi làm bài 
    tập mà hãy viết nó ra, việc đó
    giải phóng bộ nhớ để tập trung
    phát triển tư duy phản biện, giải
    quyết nhiều bài khó hơn.
  </>}, 
  image_importor("einstein"),
  "right"
)

const Interleaved_practice = new DetailOfTips(
  {
    eng: "Interleaved practice",
    vn: "Trao đổi môn học",
    src : image_importor("whale").src
  },
  {eng:
    <>
      Rather than "Block practice" learning only 1 topic at a time 
      Interleaving involves learning different topics of the same subject, 
      or even different subjects in a session. 
      <br/>
      for example, in Math you can alternate
      between learning probability propability, algrebra, and 3D geometry.
      Doing this can feel messy at first, but means your brain more actively
      works to organize, distinguish the topics being studied hence enabling
      you to helps you to understand and remember more..<CITATE n="11" src="https://pmc.ncbi.nlm.nih.gov/articles/PMC8589969/"/>
    </>,
    vn:
    <>
    Thay vì học theo kiểu truyền thống là "Block practice" 
    (học hết toàn bộ kiến thức chương này rồi mới sang chương khác),
    <br/>
     Interleaving buộc não bộ phải liên tục phân biệt giữa các dạng bài tập
    và lý thuyết khác nhau. Dù lúc đầu có vẻ "rối" và chậm hơn, nhưng nó
    tạo ra sự thử thách cần thiết giúp kiến thức được khắc sâu<CITATE n="11" src="https://pmc.ncbi.nlm.nih.gov/articles/PMC8589969/"/>
  </>}, 
  image_importor("INTERLEAVE"),
  "left"
)

const Story_telling = new DetailOfTips(
  {
    eng: "story telling",
    vn: "Kể chuyện",
    src : image_importor("whale").src
  },
  {eng:
    <>
      For example a mnemonic story like Raging Martian
       Invades Venus Using X-ray Gun helps to remember
      components of light called the electromagtic spectrum
       through the first letter of each word.<CITATE n="4" src="https://voljournals.utk.edu/cgi/viewcontent.cgi?article=3943&context=utk_graddiss"/>
  </>,
  vn:
  <>
   Để giúp bạn dễ nhớ các thành phần của phổ điện từ bằng tiếng Việt, 
   chúng ta có thể chuyển đổi câu chuyện đó sang  dễ nhớ dựa trên chữ cái đầu 
   của các thuật ngữ chuyên môn: Radio (R) → Rất; Microwave (Mi) → Mệt; Infrared 
   (Hồng ngoại) → Hòng; Visible light (Anh sáng nhìn thấy) → Ăn;
    Ultraviolet (Tử ngoại) → Thịt X-ray (X) → Xào; Gamma (G) → Gà
    Câu thần chú tiếng Việt: "Rất Mệt Hòng Ăn Thịt <CITATE n="4" src="https://voljournals.utk.edu/cgi/viewcontent.cgi?article=3943&context=utk_graddiss"/>
  </>},
  image_importor("alien"),
  "right"
)

const FEYNMAN_technique = new DetailOfTips(
  {
    eng: "FEYNMAN Technique",
    vn: "Kỹ thuật FEYNMAN",
    src : image_importor("sharky").src
  },
  {eng:<>
    A 4-mental steps process to understand a topic;
    Firstly choose your topic, Secondly after learning 
    find a peer to explain it to , Thirdly, identify what 
    you didn't explain clearly, Lastly, revise those sections
     to fill those gaps. <CITATE n="5" src="https://www.adobe.com/acrobat/resources/feynman-technique.html#:~:text=This%20study%20method%20is%20named,and%20refining%20your%20understanding%20further."/>
  </>,
  vn:<>
    Có 4 bước tư duy để hiểu một chủ đề.<CITATE n="5" src="https://www.adobe.com/acrobat/resources/feynman-technique.html#:~:text=This%20study%20method%20is%20named,and%20refining%20your%20understanding%20further."/>
    Thứ nhất, hãy chọn chủ đề.
    Thứ hai, sau khi học xong, hãy tìm một người bạn để giải thích lại cho họ.
    Thứ ba, xác định những phần mà bạn chưa thể giải thích rõ ràng.
    Cuối cùng, cải thiện những chỗ còn thiếu đó.
  </>},
  image_importor("PRESENTATION"),
  "left",
  <>
  <p>
    Albert einstein once said "If you can't explain it simply,
     you don't understand it well enough." and that is very true when it comes
    to explaining ideas to people.
  </p>
  <iframe src="https://www.youtube.com/embed/dRA_UW6ZfOQ?si=wc-jqgL__ub9Oxdd" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
  </>
)
const Memory_Palace = new DetailOfTips(
  {
    eng: "Memory palace",
    vn: "Lâu đài Trí nhớ",
    src: image_importor("whale").src
  },
  {
    eng:
    <>
      A memory palace is a mnemonic technique where you mentally place vivid,
       exaggerated images of information at specific locations inside a familiar
        physical space to easily recall them later. This strategy transforms 
        abstract facts into spatial data, allowing your brain to navigate its 
        natural layout and retrieve the stored information sequentially.<CITATE n="17" src="https://www.zmescience.com/medicine/mind-and-brain/memory-palace/"/>
    </>,
    vn:
    <>
      một kỹ thuật ghi nhớ bằng cách đặt những hình ảnh sinh động,
      cường điệu của thông tin vào các vị trí cụ thể trong một 
      không gian quen thuộc để dễ dàng gợi nhớ lại sau này. Chiến 
      lược này chuyển đổi các dữ liệu trừu tượng thành dữ liệu không
      gian, giúp não bộ điều hướng theo sơ đồ tự nhiên và truy xuất
      thông tin đã lưu trữ theo một trình tự rõ ràng.<CITATE n="17" src="https://www.zmescience.com/medicine/mind-and-brain/memory-palace/"/>
    </>
  },
  image_importor("palace"),
  "right",

)
const Summary_and_print_meta = new DetailOfTips(
  {
    eng: "summary & print",
    vn: "Tóm tắt & in ra",
    src : image_importor("fish").src
  },
  {eng:
    <>
       This is a google doc that 
      you can print that has all the tips,
      in more detail with evidence{" "}
      <a
        href="https://docs.google.com/document/d/1qfUi1f6OYUYhAAmggj1jGT7vZiK1PzGi_ZmotVSADTo/edit?usp=sharing"
      target="_blank"
    >
      <button>THE GG DOC</button>
    </a>
  </>,
  vn:
  <>
    Đây là file <a
      href="https://docs.google.com/document/d/1qfUi1f6OYUYhAAmggj1jGT7vZiK1PzGi_ZmotVSADTo/edit?usp=sharing"
      target="_blank"
    >
      <button>THE GG DOC</button>
    </a> giúp bạn in toàn bộ
    các mẹo, kèm giải thích chi tiết hơn và dẫn chứng.
  </>},
)


/*===========================NOTE-TAKE=================================*/


const One_sentence = new DetailOfTips(
  {
    eng: "1 sentence",
    vn: "1 câu",
    src : image_importor("fish").src
  },
  {eng:
    <>
      inspired by the feymen technique
      summarize  everything you need to
       understand into a single sentence, this 
      forces you to choose between words which
      activates your comprehension skill
  </>,
  vn:
  <>
    Được lấy cảm hứng từ cách học Feyman
    Tóm tắt tất cả yếu tố cần để hiểu chủ đề
    vào <b>một câu</b>. Điều này buộc bạn phải chọn lọc
    từ ngữ, kích hoạt khả năng hiểu – không chỉ chép lại.
  </>}
)

const Divide_steps = new DetailOfTips(
  {
    eng: "divide steps",
    vn: "Chia từng bước",
    src : image_importor("whale").src
  },
  {eng:
    <>
      divide your exercise  into steps
      with clear instructions like Cambrigde does it
    </>,
    vn:
    <>
      Chia bài tập hoặc nội dung học thành các bước rõ ràng,
      giống như cách Cambridge hướng dẫn:
      Bước 1 làm gì, Bước 2 làm gì… Não sẽ dễ đi theo
      hơn là nhìn một khối thông tin lớn.
    </>
  },
  image_importor("STEP"),
  "left"
)

const Derive_basics = new DetailOfTips(
  {
    eng: "derive basics",
    vn: "học nền tảng",
    src : image_importor("sharky").src
  },
  {eng:
    <>
       Complex equations/ formulas are made
      up by other basic formulas, like 
      how the "1/2cos(B).a.b" formula
      for the area of a triangle consists of sin, cos and 1/2.base.height.
      Breaking a complex formula into its component parts
      helps you remember the basics
      that make it up, hence deepens your memory of it.
  </>,
  vn:
  <>
    với những công thức, ví dụ như "1/2cos(B).a.b" để
    hiểu nó thì bạn cần phải hiểu tại sao có công thức 
    mà bạn đang tim hiểu trong ví dụ là từ tỉ số lượng giác 
    sin cos tan và công thức 1/2.cạnh đáy.đường cao
  </>},
  image_importor("dedrive"),
)

const Leitner_system = new DetailOfTips(
  {
    eng: "Leitner system",
    vn: "Hệ thống Leitner",
    src : image_importor("sharky").src
  },
  {eng:
    <>
      A deeper level of flash cards use, where a group
      of flash cards is arranged into a set of 3 or more boxes marked by 1,2,3,...
      choose a card and test yourself. If you get it correct move the card to the next
      box if not return it to box 1.<CITATE src="https://pmc.ncbi.nlm.nih.gov/articles/PMC12658577/" n="6"/>
  </>,
  vn:
  <>
    phương pháp Leitner (Leitner System) hoạt động như sau
    Bạn sắp xếp các thẻ thông tin (flashcards) vào các hộp
    được đánh số 1, 2, 3... Nếu trả lời thẻ đúng, bạn 
    chuyển nó sang hộp tiếp theo. Nếu trả lời sai, thẻ đó 
    sẽ bị chuyển ngược về hộp số 1. <CITATE src="https://pmc.ncbi.nlm.nih.gov/articles/PMC12658577/" n="6"/>
  </>},
  image_importor("Leitner"),
  "left",
  <>
    <video controls><source src={image_importor("Leitner_vid").src} type="video/mp4"/></video>
    <iframe width="560" height="315" src="https://www.youtube.com/embed/kB-NuR6NTZw?si=BDrD5yloPbgS70l9" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
  </>,
  image_importor("LEINTNER")

)

const Note_taking_4x4 = new DetailOfTips(
  {
    eng: "Note-taking 4x4",
    vn: "Ghi chú 4x4",
    src : image_importor("fish").src
  },
  {eng:
    <>
      A simplifed version of mind mapping,
      each idea is divided into another 4 ideas
      as shown in the picture
    </>,
    vn:
    <>
      đây là phiên bản đơn giản của mindmap,
      mỗi ý chính lại tách ra thành 4 ý nhỏ hơn,
      như trong hình minh hoạ.
    </>
  },
  image_importor("4X4"),
  "right"
)

const ABBREVIATION = new DetailOfTips(
  {
    eng: "ABBREVIATION!",
    vn: "Viết tắt",
    src : image_importor("fish").src
  },
  {eng:
    <>
      Arrange target element's first letter
      into 1 word. This will save memory & 
      time by remembering 1 word instead of many;
    </>,
    vn:
    <>
      Lấy chữ cái đầu của các ý quan trọng và ghép thành
      một từ hoặc cụm từ dễ nhớ. Nhớ một từ nhưng chứa
      cả một nhóm thông tin phía sau → nhẹ não hơn.
    </>
  },
  image_importor("SWOT"),
  "right"
)

const You_vs_book_cycle = new DetailOfTips(
  {
    eng: "you vs book cycle",
    vn: "Chu trình bạn vs sách",
    src : image_importor("whale").src
  },
  {eng:
    <>
      Listen and write down what
      you listened to into a notebook from memory and 
      finally compare your notes to your book so see
      if there are errors, then repeat the task or ask
    </>,
    vn:
    <>
      Nghe/đọc xong, hãy viết lại vào vở theo cách
      bạn hiểu (không nhìn sách). Sau đó so sánh lại
      với sách: chỗ nào thiếu hoặc sai thì ghi chú,
      hỏi lại hoặc ôn lại. Cứ lặp lại chu trình đó.
    </>
  },
  image_importor("CYCLE"),
  "left"
)

const CORNELL_method = new DetailOfTips(
  {
    eng: "CORNELL method",
    vn: "Phương pháp Cornell",
    src : image_importor("fish").src
  },
  {eng:
    <>
      Cornell states that the side area is for writing
      your questions and keywords, and the biggest section is 
      for the notes of the details and the downward
      square is used for a summery <CITATE src="https://www.researchgate.net/publication/399574345_The_Influence_of_the_Cornell_Note-Taking_Method_on_Students'_Reading_Comprehension_of_Explanation_Text" n="7"/>
    </>,
    vn:
    <>
      Cornell nói rằng phần cạnh bên dùng để ghi ý chính,
      phần giữa ghi nội dung chi tiết, phần cuối trang
      dùng để tóm tắt lại toàn bộ. Một trang vừa là ghi chú,
      vừa là bản tóm tắt.<CITATE src="https://www.researchgate.net/publication/399574345_The_Influence_of_the_Cornell_Note-Taking_Method_on_Students'_Reading_Comprehension_of_Explanation_Text" n="7"/>
    </>
  },
  image_importor("CORNELL"),
  "right",
  <iframe  src="https://www.youtube.com/embed/GKodBunEPuI?si=6ERiznbgXUVsTurE" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>,
  image_importor("Cornor")
)

const HIGHLIGHT = new DetailOfTips(
  {
    eng: "HIGHLIGHT!",
    vn: "Tô đậm hiệu quả",
    src : image_importor("fish").src
  },
  {eng:
    <>
      Only do it after reading the full topic and have summarized it in your own words but preferably use a yellow  hightlighter because it contrasts best with black letters <CITATE src="https://www.shiftelearning.com/blog/how-do-colors-influence-learning#:~:text=4)%20Yellow:%20The%20Powerhouse%20for,studying%20in%20neutrally%2Dcolored%20environments." n="8"/>
    </>,
    vn:
    <>
      Chỉ nên highlight sau khi bạn đã đọc hết chủ đề
      và tóm tắt lại bằng lời của mình. Highlight những chỗ
      thật sự là “then chốt”, và cuối cùng hãy ưu tiên dùng 
      màu vàng vì nó tương phản tốt nhất với chữ đen<CITATE src="https://www.shiftelearning.com/blog/how-do-colors-influence-learning#:~:text=4)%20Yellow:%20The%20Powerhouse%20for,studying%20in%20neutrally%2Dcolored%20environments." n="8"/> giúp bạn dễ nhớ hơn.
    </>
  },
  image_importor("highlight"),
  "left"
)

const Summary_and_print_note = new DetailOfTips(
  {
    eng: "summary & print",
    vn: "Tóm tắt & in ra",
    src : image_importor("fish").src
  },
  {eng:
    <>
      This is a google doc that 
      you can print that has all the tips,
      in more detail with evidence{" "}
      <a
        href="https://docs.google.com/document/d/1qfUi1f6OYUYhAAmggj1jGT7vZiK1PzGi_ZmotVSADTo/edit?usp=sharing"
        target="_blank"
    >
      <button>THE GG DOC</button>
    </a>
  </>,
  vn:
    <>
      Đây là file <a
        href="https://docs.google.com/document/d/1qfUi1f6OYUYhAAmggj1jGT7vZiK1PzGi_ZmotVSADTo/edit?usp=sharing"
        target="_blank"
      >
      <button>THE GG DOC</button>
    </a> giúp bạn in toàn bộ
    các mẹo, kèm giải thích chi tiết hơn và dẫn chứng.
  </>}
)

const VARK_learners = new DetailOfTips(
  {
    eng: "VARK types of learners",
    vn: "VARK phân định cách học",
    src : image_importor("whale").src
  },
  {eng:
    <>
      VARK is a popular framework that catagorizes 
      four types of learning: <u>Visual, Aural, Read/Write and Kinesthetic</u><br/>
       Visual, can be trained with perphiral vision at pre-learn; 
      Aural can be seen in learning with friend, Feyman Technique;
      Read/Write, methods in the Note-take section can improve it;
      Kinesthetic, this is for people who loves doing projects or hands-on learning.<CITATE src="https://digitalcommons.unl.edu/cgi/viewcontent.cgi?article=1245&context=podimproveacad" n="15"/><br/>
    </>,
    vn:
    <>
      VARK là một mô hình phổ biến dùng để phân loại bốn
      phương pháp học tập. Đầu tiên là Thị giác, phương pháp 
      giúp bạn rèn luyện mắt trong phần kỹ năng đọc rộng. 
      Thứ hai là việc nói và nghe, thường thấy qua cách học
      cùng bạn bè, áp dụng kỹ thuật Feynman. Thứ ba là Đọc/Ghi chép,
      phương pháp có thể cải thiện bằng cách sử dụng các mẹo trong phần
      note-take. Cuối cùng là Vận động, phương pháp dành cho những người
      yêu thích làm dự án hoặc học tập qua trải nghiệm thực tế. 
     <CITATE src="https://digitalcommons.unl.edu/cgi/viewcontent.cgi?article=1245&context=podimproveacad" n="15"/> 
    </>
  }, 
  image_importor("VARK"),
  "right",
)



export const preLearnTips = [
  Prime_question,
  Promodoro,
  Peripheral_vision,
  Everything_in_1_place,
  Auto_google,
  Water_ur_face_body,
  Strooper_effect,
  Short_workout,
  Long_term_workout,
  Structure_your_day,
  Track_progress,
  Brain_diet,
  Summary_and_print_pre
]

export const metaLearnTips = [
  Header_first,
  Use_a_pointer,
  Spaced_learning,
  Einstein_framework,
  Break_not_distraction,
  Premacks_principle,
  Interleaved_practice,
  Story_telling,
  FEYNMAN_technique,
  Memory_Palace,
  Summary_and_print_meta

]

export const noteTakeTips = [
  One_sentence,
  Divide_steps,
  Derive_basics,
  Leitner_system,
  Note_taking_4x4,
  ABBREVIATION,
  You_vs_book_cycle,
  CORNELL_method,
  HIGHLIGHT,
  Summary_and_print_note
]

const yourMethods = [
  VARK_learners
]



const question_options = [
    {
    question: "What is your biggest study problem?",
    options: [
      {
        answer: "get distracted easily",
        tips: [Promodoro, Break_not_distraction, Use_a_pointer]
      },
      {
        answer: "don't know what to focus on",
        tips: [Prime_question, Everything_in_1_place, Structure_your_day]
      },
      {
        answer: "feel tired or low energy",
        tips: [Water_ur_face_body, Short_workout, Brain_diet]
      },
      {
        answer: "forget things too quickly",
        tips: [Spaced_learning, Leitner_system, Memory_Palace]
      }
    ]
  },

  {
    question: "What kind of material are you studying?",
    options: [
      {
        answer: "Long textbook or article",
        tips: [Header_first, CORNELL_method, HIGHLIGHT]
      },
      {
        answer: "Difficult concept",
        tips: [Einstein_framework, FEYNMAN_technique, Derive_basics]
      },
      {
        answer: "Many facts or definitions",
        tips: [Leitner_system, Memory_Palace, ABBREVIATION]
      },
      {
        answer: "Problem-solving subject",
        tips: [Divide_steps, Interleaved_practice, Track_progress]
      }
    ]
  },

  {
    question: "What do you want help with most?",
    options: [
      {
        answer: "Prepare before studying",
        tips: [Prime_question, Peripheral_vision, Auto_google]
      },
      {
        answer: "Understand better while learning",
        tips: [Story_telling, FEYNMAN_technique, Einstein_framework]
      },
      {
        answer: "Take better notes",
        tips: [One_sentence, Note_taking_4x4, CORNELL_method]
      },
      {
        answer: "Just remember ",
        tips: [Summary_and_print_pre, Summary_and_print_meta, Summary_and_print_note]
      }
    ]
  }
]


const customized_user_list = JSON.parse(localStorage.getItem("customize_user_list") || "[]").flat().filter(Boolean).map(header => [...metaLearnTips, ...preLearnTips, ...noteTakeTips].find(tip => tip.header.eng === header));  

function Customize(){
    const [questionindex, setQuestionindex ] = useState(0);

    const [suggestedtips, setSuggestedtips] = useState([])
    useEffect(() => {
      if(questionindex >= question_options.length){
      let adding_tips = JSON.stringify(suggestedtips)
      localStorage.setItem("customize_user_list", adding_tips)
    }

    },[questionindex, suggestedtips]);


    return(
      (questionindex >= question_options.length)?
        <div className="customize">
          <img src={image_importor("customize").src}/>
          <h2>You have finished customizing</h2>
          <button onClick={() => {setQuestionindex(0); setSuggestedtips([])}}>customize again?</button>
        </div>
        :
        <div className="quiz">
            <h2 className="question">{question_options[questionindex].question}</h2>
            {question_options[questionindex].options.map( (element, index) =>{
                console.log(element.tips)
                return(
                <button 
                    key={index}
                    onClick={() =>{
                        setQuestionindex(prev => prev + 1);
                        setSuggestedtips(prev=> prev.concat(element.tips.map(tip => tip.header.eng)))
                        console.log(element.tips)
                      }}>
                    <div className="answer">{element.answer}</div>
                </button>
                )
            })}
            <p>{questionindex + 1} out of 3 questions</p>
        </div>
    )}


/*=======================================DATA BASE=================================================*/


export const list_of_tips = [
  new TypeOfTips(
    "YOUR-LEARN",
    {eng: <div className="introduction">
        <h2>Introduction</h2>
        <p>
        - YOUR-METHOD is the section where you write down your methods and <u>remember it with Edulience's methods</u><br/>
        - YOUR-METHOD is also the section that connects you with the most suitable learning methods<br/>
        - Each method will have different effort levels from easy, medium to hard.<br/>
        <img src={image_importor("fish").src}/><img src={image_importor("whale").src}/><img src={image_importor("sharky").src}/>
        </p>
      </div>,
      vn: <div className="introduction">
         <h2>Giới thiệu</h2> 
          <p> 
            - Phần YOUR-METHOD cho bạn có thể ghi lại những phương pháp học tập của bạn, giúp bạn.<u>xem phương pháp học tập của bạn và Edulience</u><br/>
            - Phần VARK trong YOUR-METHOD sẽ kết nối bạn với những phương pháp có trên Edulience. 
            - Mỗi phương pháp sẽ có các mức độ nỗ lực khác nhau từ dễ, trung bình đến khó.<br/>
            <img src={image_importor("fish").src}/><img src={image_importor("whale").src}/><img src={image_importor("sharky").src}/> 
          </p> 
        </div>},
        (user_list.concat(yourMethods)).concat(customized_user_list),
        <>
          <Customize/>
          <AddingMethods/>
        </>,
  ),
  new TypeOfTips(
    "PRE-LEARN",
      {eng: <div className="introduction">
        <h2>Introduction</h2>
        <p>
        - PRE-LEARN gives you a list of methods you can use before studying to <u>get in the right mindset to
        to learn</u><br/>- Each method will have
        different effort levels: easy, medium and hard.<br/><img src={image_importor("fish").src}/><img src={image_importor("whale").src}/><img src={image_importor("sharky").src}/>
        </p>
      </div>,
      vn: <div className="introduction">
         <h2>Giới thiệu</h2> 
          <p> 
            - Phần PRE-LEARN này cung cấp cho bạn danh sách các phương pháp mới để thực hiện trước khi bắt đầu học, giúp bạn <u>sẵn sàng tiếp thu kiến thức</u><br/>
            - Mỗi phương pháp sẽ có các mức độ nỗ lực khác nhau từ dễ, trung bình đến khó.<br/>
            <img src={image_importor("fish").src}/><img src={image_importor("whale").src}/><img src={image_importor("sharky").src}/> 
          </p> 
        </div>},
        preLearnTips),

  new TypeOfTips(
    "META-LEARN",
      {eng:<div className="introduction">
        <h2>Introduction</h2>
        <p>
        - META-LEARN gives you a lists 
        of methods that you can use to help you <u>learn how to study effectively</u>.
        <br/>- Each method will have
        different effort levels: easy, medium and hard<br/><img src={image_importor("fish").src}/><img src={image_importor("whale").src}/><img src={image_importor("sharky").src}/>
        </p>
      </div>,
      vn: <div className="introduction">
        <h2>Giới thiệu</h2>
        <p>
        - Phần META-LEARN này cung cấp danh sách các phương pháp gợi ý giúp bạn <u>học cách học hiệu quả</u>.
        <br/>- Mỗi phương pháp sẽ có các mức độ nỗ lực khác nhau từ dễ, trung bình đến khó.
        <br/><img src={image_importor("fish").src}/><img src={image_importor("whale").src}/><img src={image_importor("sharky").src}/>
        </p>
      </div>},
    metaLearnTips),

  new TypeOfTips(
    "NOTE-TAKE",
    {eng:<div className="introduction">
        <h2>Introduction</h2>
        <p>
        - NOTE-TAKING gives you methods that will allow you to takes 
        note more effectively so that you can <u>write the least and gain the most</u>.
        <br/>- Each method will have
        different effort levels: easy, medium and hard.<br/><img src={image_importor("fish").src}/><img src={image_importor("whale").src}/><img src={image_importor("sharky").src}/>
        </p>
    </div>,
    vn: <div className="introduction">
        <h2>Giới thiệu</h2>
        <p>
        - Phần NOTE-TAKE này cung cấp danh sách các phương pháp gợi ý giúp bạn ghi chú hiệu quả để có thể <u>viết ít nhất nhưng thu nhận được nhiều nhất</u>.
        <br/>- Mỗi phương pháp sẽ có các mức độ nỗ lực khác nhau từ dễ, trung bình đến khó.
        <br/><img src={image_importor("fish").src}/><img src={image_importor("whale").src}/><img src={image_importor("sharky").src}/>
        </p>
      </div>},
    noteTakeTips
  ),
];
// Named export above; no default export to avoid import ambiguity

     