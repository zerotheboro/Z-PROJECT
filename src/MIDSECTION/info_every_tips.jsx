import LOGO from "../image/LOGO.png";
import Main from './COLOR_CHANGE.jsx';
import Clock from "./Clock.jsx";
import Timer from './Clock.jsx';

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
class DetailOfTips{
  constructor(header = "header", paragraph = "p", VNheader = "VN 1#", VNparagraph = "VN para !!!", asset = image_importor("LOGO", "image"), side="right", more_info= false, audio = false){
    this._header = header;
    this._paragraph = paragraph;
    this._asset = asset;
    this._side = side;
    this._VNheader = VNheader;
    this._VNparagraph =VNparagraph;
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
  get VNheader(){
    return this._VNheader;
  }
  get VNparagraph(){
    return this._VNparagraph;
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
    default : num = props.num;
  }
  return(
    <a href={props.src} target="_blank" className="cite">({num})</a>
  )
}


export const list_of_tips = [
  new TypeOfTips(
    "PRE-LEARN",
    <>
      <div className="introduction">
        <h2>Introduction</h2>
        <p>
        - This section will give you a lists 
        of methods that you can do to help you <u>get ready
        to learn</u> before you learn.<br/>- Each method will have
        different effort levels from easy, medium to hard.
        </p>
      </div>
    </>,
    [
      new DetailOfTips(
        "Prime question",
        <>
          determine the importance of it 
          to yourself by asking what will this 
          help me, and the more important something
          is the more u pay attention. doing this
          reflect the importance.
        </>,
        "Câu hỏi đầu",
        <>
          Xác định tầm quan trọng của việc này
          với cách tự hỏi: “Cái này sẽ
          giúp mình điều gì?”. Việc gì càng quan trọng
          thì bạn càng tự nhiên tập trung vào nó.
          Bước nhỏ này giống như soi lại để nhắc não:
          chuyện này <b>thật sự</b> quan trọng với mình.
        </>,
        image_importor("brain.svg"),
        "left"
      ),
       new DetailOfTips(
        "Pomodoro technique",
        <>
          it's a time management tool that helps you
          manage your task by, <br/>
          step1 1: identify tasks needed
        </>,
        "cà chua quản lý thời gian",
        <>
          Bước 1: Chọn một công việc cần hoàn thành.
          Bước 2: Đặt đồng hồ trong 25 phút. <br/>
          Bước 3: Tập trung hoàn toàn vào công việc cho đến khi chuông reo.<br/>
          Bước 4: Nghỉ giải lao ngắn trong 5 phút.<br/>
          Bước 5: Sau mỗi 4 lần nghỉ ngắn, hãy nghỉ một quãng dài từ 15–30 phút.
        </>,
        image_importor(<Clock/>, ""),
        "left",
        <iframe  src="https://www.youtube.com/embed/g619AwxdJnY?si=1cUd1y1VmFJ-R11I" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
      ),
      new DetailOfTips(
        "Everything in 1 place",
        <>
          free up ur mind by putting everything you
          need at 1 place, Moreover you would notice 
          easier and get it done, and edulience offer
          <a
            href="https://zerotheboro.github.io/KINGSTON/"
            target="_blank"
          >
            BOXITO
          </a>{" "}
          can help u achive that for free at the your opinion section
        </>,
        "mọi thứ một chỗ",
        <>
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
        </>,
        image_importor("BOXITO"),
        "right"
      ),
      new DetailOfTips(
        "AUTO GOOGLE",
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
        "mở tab tự động",
        <>
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
        </>,
        image_importor("google", "video"),
        "",
        false,
        image_importor("auto_goggle")
      ),
       new DetailOfTips(
        "WATER ur face/body",
        <>
          Drink water around a glass of water
          and splash water onto ur face to awake
          your mind!
        </>,
        "nước & nước",
        <>
          Uống khoảng một ly nước và té nước lên mặt
          hoặc cơ thể để đánh thức cơ thể dậy.
          Cơ thể tỉnh thì não mới dễ bật chế độ tập trung.
        </>,
        image_importor("water"),
        "left"
      ),
      
      new DetailOfTips(
        "Strooper effect",
        <>
          this is a brain excercise<CITATE n="3" src="https://www.apa.org/research-practice/conduct-research/stroop-effect#:~:text=Despite%20the%20slow%20start%2C%20Stroop,invaluable%20tool%20for%20exploring%20cognition."/> that 
          trains the brain to handle disorder
          informations, which is the color
          and text, instruction: 1. press button<br/>
          2. read the color and not the text.

        </>,
        "Bài Strooper",
        <>
          Đây là 1 bài khởi động cho 
          bộ não<CITATE n="3" src="https://www.apa.org/research-practice/conduct-research/stroop-effect#:~:text=Despite%20the%20slow%20start%2C%20Stroop,invaluable%20tool%20for%20exploring%20cognition."/> cách sắp xếp thong tin mâu thuẫn
          với nhau được chứng minh bỡi tiến sĩ Strooper.
          bước 1: nhấn nút<br/>
          bước 2: đọc cái màu của chữ
        </>,
        image_importor(<Main/>, ""),
        "left", 
        false,
        image_importor("strooper_audio")
      ),

      new DetailOfTips(
        "BREAK ≠ DISTRACTION",
        <>
          try to take neccesary break and not 
          surround yourself with distractions which
          can derail your focus
        </>,
        "Nghỉ ngơi ≠ Mất tập trung",
        <>
          Hãy cho mình những khoảng nghỉ cần thiết,
          nhưng đừng bao vây bản thân bằng các thứ
          gây xao nhãng (mạng xã hội, game, short video…).
          Nghỉ để hồi năng lượng, không phải để trôi luôn
          khỏi việc học.
        </>,
        image_importor("relaxing_cat"),
        "right"
      ),

      new DetailOfTips(
        "small workout",
        <>
          doing a small workout before learning
          helps u get your brain the oxygen it needed more
          and it can be simple like streching or pushup, situp.
        </>,
        "Vận động nhẹ",
        <>
          Trước khi học, hãy vận động nhẹ một chút
          (vươn vai, chống đẩy, gập bụng,…). Điều này giúp
          máu lưu thông tốt hơn, đưa nhiều oxy lên não,
          làm bạn tỉnh táo và tập trung hơn.
        </>,
        image_importor("dumbell"),
        "left"
      ),
      new DetailOfTips(
        "long-term workout",
        <>
          studies of Stanford, South California<CITATE n="1" src="https://lifestylemedicine.stanford.edu/exercise-better-grades/"/>
          showed that doing excercises regulary
          grow your hippocampus a brain's region 
          associate with learning! because of that 
          edulience offer 1 month free trial of California
          claim it at your opinion section
        </>,
        "Vận động lâu dài",
        <>
          nghiên cứu ở Standford and Nam California<CITATE n="1" src="https://lifestylemedicine.stanford.edu/exercise-better-grades/"/>
          gợi ý rằng tập thể dục thường xuyên giúp
          não bộ lớn và vì vậy Edulience sẽ tặng bạn
          1 tháng tập ở California gym nhận nó ở phần
          ý kiến của bạn 
        </>,
        image_importor("dumbell"),
      ),


      new DetailOfTips(
        "Structure your day",
        <>
          brain loves certainty, structuring
          reduces energy of deciding what to do next
        </>,
        "Lên khung ngày của bạn",
        <>
          Não rất thích sự rõ ràng. Khi bạn sắp xếp trước
          mình sẽ làm gì – lúc nào – trong bao lâu, bạn giảm
          được rất nhiều “ma sát” khi phải quyết định tiếp theo
          làm gì. Ít phân vân → nhiều năng lượng hơn để học.
        </>,
        image_importor("multiple_checkbox"),
      ),

      new DetailOfTips(
        "Premack's principle",
        <>
          find the thing you love to do and do it last,
          this gives u the urge to finish everything
          in order to do the thing you want to do
        </>,
        "hiệu quả Premack",
        <>
          Tìm thứ bạn thích làm nhất (xem phim, chơi game,
          nghe nhạc…) và đặt nó ở <b>cuối danh sách</b>.
          Bạn sẽ có thêm động lực tự nhiên để hoàn thành
          những việc cần làm trước để “mở khoá” phần thưởng đó.
        </>,
        image_importor("pirate_map"),
        "left"
      ),

      new DetailOfTips(
        "Track progress",
        <>
          motivate you and keep you
          in mind how much you progress
        </>,
        "Theo dõi tiến trình",
        <>
          Ghi lại bạn đã học được gì, bao nhiêu, trong bao lâu.
          Điều này vừa tạo động lực (thấy mình đi được khá xa),
          vừa giúp bạn biết chỗ nào cần điều chỉnh.
        </>,
        image_importor("checkbox"),
        "right"
      ),

      new DetailOfTips(
        "BRAIN DIET",
        <>
          + Omega-3 from fish Fatty fish (salmon, cod)<br/>
          + Leafty vegetables (kale, spinach and broccoli)<br/>
          + Berries (strawberries, blueberries)<br/>
          + Walnuts (Avocado,Walnuts)<br/> suggested from Havard<CITATE src="https://www.health.harvard.edu/healthbeat/foods-linked-to-better-brainpower" n="2"></CITATE>
        </>,
        "Chế độ não ăn ",
        <>
          + Omega-3 từ cá, đặc biệt là các loại cá béo (cá hồi, cá tuyết) <br/>
          + Rau lá xanh (cải xoăn, rau bina và bông cải xanh)<br/>
          + Các loại quả mọng (dâu tây, việt quất)<br/>
          + Quả óc chó (bơ, óc chó)<br/>
          nghiên cứu từ Havard<CITATE src="https://www.health.harvard.edu/healthbeat/foods-linked-to-better-brainpower" n="2"></CITATE>
        </>,
        image_importor("chicken"),
        "left"
      ),

      

      

      new DetailOfTips(
        "summary & print",
        <>
          this is a google doc that would
          help you print all the tips,
          and explain the tips in more details + evidences{" "}
          <a
            href="https://docs.google.com/document/d/1qfUi1f6OYUYhAAmggj1jGT7vZiK1PzGi_ZmotVSADTo/edit?usp=sharing"
            target="_blank"
          >
            <button>THE GG DOC</button>
          </a>
        </>,
        "Tóm tắt & in ra",
        <>
          Đây là file <a
            href="https://docs.google.com/document/d/1qfUi1f6OYUYhAAmggj1jGT7vZiK1PzGi_ZmotVSADTo/edit?usp=sharing"
            target="_blank"
          >
            <button>THE GG DOC</button>
          </a> giúp bạn in toàn bộ
          các mẹo, kèm giải thích chi tiết hơn và dẫn chứng.
        </>
        // asset + side omitted → use defaults
      ),
    ],
  ),

  new TypeOfTips(
    "META-LEARN",
      <div className="introduction">
        <h2>Introduction</h2>
        <p>
        - This section will give you a lists 
        of methods that you can do to help you <u>learn how to learn effectively</u>.
        <br/>- Each method will have
        different effort levels from easy, medium to hard.
        </p>
      </div>,
    [
      new DetailOfTips(
        "HEADER first",
        <>
          often we don't put much thoughts
          but doing it aids you in getting
          the overall idea better
        </>,
        "Tiêu đề trước",
        <>
          Thường chúng ta lướt qua tiêu đề rất nhanh,
          nhưng đọc kỹ tiêu đề trước giúp não có khung tổng quan.
          Khi đã có “khung”, nội dung chi tiết sẽ dễ được gắn kết
          và hiểu sâu hơn.
        </>
      ),

      new DetailOfTips(
        "peripheral vision",
        <>
          train how your eye to 
          collect info quick to the brain by games
          like <a href="https://schultetable.web.app" target="_blank"><button>Schutle table</button></a> or my strooper game at pre-learn section or <a href="https://en.wikipedia.org/wiki/Brock_string" target="_blank"><button>Brock string</button></a>
        </>,
        "kỹ năng đọc rộng",
        <>
          Việc đọc nhanh rất tuyệt vời và 
          bạn có thể luyện nó bằng phương pháp
          <a href="https://schultetable.web.app" target="_blank"><button>Schutle table</button></a> 
          và<a href="https://en.wikipedia.org/wiki/Brock_string" target="_blank"><button>Brock string</button></a>
           hoặc dùng bài Strooper ở PRE-LEARN.
        </>,
        image_importor("eye"),
        "left"
      ),

      new DetailOfTips(
        "Use length pointer",
        <>
          use pointer finger or ruler...
          to track your reading allowing continutity
          (no progression) which saves your time
        </>,
        "Dùng 'con trỏ'",
        <>
          Dùng ngón tay, bút hoặc thước để đi theo dòng chữ khi đọc.
          Điều này giúp mắt bám theo tốt hơn, hạn chế nhảy dòng,
          giảm thời gian phải tìm lại chỗ đang đọc dở.
        </>,
        image_importor("book_pointer"),
        "right"
      ),
      new DetailOfTips(
        "Einstein framwork",
        <>
          Albert Einstein used to say "don't memorize 
          something that can be look up"
        </>,
        "Hiểu quả Einstein",
        <>
          Đừng nhớ công thức khi làm bài 
          tập mà hãy viết nó ra, việc đó
          giải phóng bộ nhớ để tập trung
          phát triển tư duy phản biện, giải
          quyết nhiều bài khó hơn.
        </>, 
        image_importor("einstein"),
        "left"
      ),

      new DetailOfTips(
        "story telling",
        <>
          for example story like Raging Martian 
          invade Venus Using X-ray Gun
          helps to remember components of light called electromagtic
          spectrum thourgh ther first letter.<CITATE n="4" src="https://voljournals.utk.edu/cgi/viewcontent.cgi?article=3943&context=utk_graddiss"/>
        </>,
        "Kể chuyện kiến thức",
        <>
         Để giúp bạn dễ nhớ các thành phần của phổ điện từ bằng tiếng Việt, 
         chúng ta có thể chuyển đổi câu chuyện đó sang  dễ nhớ dựa trên chữ cái đầu 
         của các thuật ngữ chuyên môn: Radio (R) → Rất; Microwave (Mi) → Mệt; Infrared 
         (Hồng ngoại) → Hòng; Visible light (Anh sáng nhìn thấy) → Ăn;
          Ultraviolet (Tử ngoại) → Thịt X-ray (X) → Xào; Gamma (G) → Gà
          Câu thần chú tiếng Việt: "Rất Mệt Hòng Ăn Thịt <CITATE n="4" src="https://voljournals.utk.edu/cgi/viewcontent.cgi?article=3943&context=utk_graddiss"/>
        </>,
        image_importor("alien"),
        "right"
      ),

      new DetailOfTips(
        "FEYNMAN Technique",
        <>
          A 4-mental steps to understand a topic; Firstly
          choose your topic, Secondly after learning
          find a peer to explain it, Thirdly identify what you
          didn't explain clearly, Lastly improve those gaps
          from then. <CITATE n="5" src="https://www.adobe.com/acrobat/resources/feynman-technique.html#:~:text=This%20study%20method%20is%20named,and%20refining%20your%20understanding%20further."/>
        </>,
        "FEYNMAN/Trình bày",
        <>
          Có 4 bước tư duy để hiểu một chủ đề.<CITATE n="5" src="https://www.adobe.com/acrobat/resources/feynman-technique.html#:~:text=This%20study%20method%20is%20named,and%20refining%20your%20understanding%20further."/>
          Thứ nhất, hãy chọn chủ đề.
          Thứ hai, sau khi học xong, hãy tìm một người bạn để giải thích lại cho họ.
          Thứ ba, xác định những phần mà bạn chưa thể giải thích rõ ràng.
          Cuối cùng, cải thiện những chỗ còn thiếu đó.
        </>,
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
      ),

      new DetailOfTips(
        "summary & print",
        <>
          this is a google doc that would
          help you print all the tips,
          and explain the tips in more details + evidences{" "}
          <a
            href="https://docs.google.com/document/d/1qfUi1f6OYUYhAAmggj1jGT7vZiK1PzGi_ZmotVSADTo/edit?usp=sharing"
            target="_blank"
          >
            <button>THE GG DOC</button>
          </a>
        </>,
        "Tóm tắt & in ra",
        <>
          Đây là file <a
            href="https://docs.google.com/document/d/1qfUi1f6OYUYhAAmggj1jGT7vZiK1PzGi_ZmotVSADTo/edit?usp=sharing"
            target="_blank"
          >
            <button>THE GG DOC</button>
          </a> giúp bạn in toàn bộ
          các mẹo, kèm giải thích chi tiết hơn và dẫn chứng.
        </>
      ),
    ]
  ),

  new TypeOfTips(
    "NOTE-TAKE",
    <div className="introduction">
        <h2>Introduction</h2>
        <p>
        - This section will give you a lists 
        of methods that you can take note effectively so that you can <u>write the least and gain the most</u>.<br/>- Each method will have
        different effort levels from easy, medium to hard.
        </p>
    </div>,
    [
      new DetailOfTips(
        "1 sentence",
        <>
          inspired by feymen technique
          summerize every elements are needed 
          to understand into a sentence, this 
          forces you to choose between words which
          activate your comprehension skill
        </>,
        "1 câu",
        <>
          Được lấy cảm hứng từ cách học Feyman
          Tóm tắt tất cả yếu tố cần để hiểu chủ đề
          vào <b>một câu</b>. Điều này buộc bạn phải chọn lọc
          từ ngữ, kích hoạt khả năng hiểu – không chỉ chép lại.
        </>
      ),

      new DetailOfTips(
        "divide steps",
        <>
          divide your excercise into steps
          with clear instructions like how
          Cambrigde do it
        </>,
        "Chia từng bước",
        <>
          Chia bài tập hoặc nội dung học thành các bước rõ ràng,
          giống như cách Cambridge hướng dẫn:
          Bước 1 làm gì, Bước 2 làm gì… Não sẽ dễ đi theo
          hơn là nhìn một khối thông tin lớn.
        </>,
        image_importor("STEP"),
        "left"
      ),
      new DetailOfTips(
        "derive basics",
        <>
          Equations/ formula made up
          by other basic formula, like 
          how "1/2cos(B).a.b" triangle area formula
          originate from sin, cos and 1/2.base.height.
          doing this help you know the basics
          that made it up, hence deepens your memory about it.
        </>,
        "học nền tảng",
        <>
          với những công thức, ví dụ như "1/2cos(B).a.b" để
          hiểu nó thì bạn cần phải hiểu tại sao có công thức 
          mà bạn đang tim hiểu trong ví dụ là từ tỉ số lượng giác 
          sin cos tan và công thức 1/2.cạnh đáy.đường cao
        </>,
        image_importor("dedrive"),
      ),
      new DetailOfTips(
        "spaced learning",
        <>
          This method is about <b>spearding reviewing time</b>,
          after you have learnt your lessons, you review it back tommorrow 
          the next time is 2 days and 4 days and so on.<br/>
          this allows for you to study with same time with more results. 
          the more info section will help you plan your review time.
        </>,
        "",
        <>

        </>,
        image_importor("dedrive"),
      ),

      new DetailOfTips(
        "Leitner system",
        <>
          a deeper level of flash cards, where a group
          of flash cards is arranged at 1 in an
          arrangement of 3 boxes or more marked by 1,2,3,...
          choose a card and test yourself after that if you got it
          correct move the card to next box if not lower it to box 1 again.<CITATE src="https://pmc.ncbi.nlm.nih.gov/articles/PMC12658577/" n="6"/>
        </>,
        "Hệ thống Leitner",
        <>
          phương pháp Leitner (Leitner System) hoạt động như sau
          Bạn sắp xếp các thẻ thông tin (flashcards) vào các hộp
          được đánh số 1, 2, 3... Nếu trả lời thẻ đúng, bạn 
          chuyển nó sang hộp tiếp theo. Nếu trả lời sai, thẻ đó 
          sẽ bị chuyển ngược về hộp số 1. <CITATE src="https://pmc.ncbi.nlm.nih.gov/articles/PMC12658577/" n="6"/>
        </>,
        image_importor("Leitner"),
        "left",
        <>
          <video controls><source src={image_importor("Leitner_vid").src} type="video/mp4"/></video>
        <iframe width="560" height="315" src="https://www.youtube.com/embed/kB-NuR6NTZw?si=BDrD5yloPbgS70l9" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
        </>,
        image_importor("LEINTNER")

      ),

      new DetailOfTips(
        "Note-take 4x4",
        <>
          a simplifed version of mind map,
          each ideas divide into another 4 ideas
          like how the picture show
        </>,
        "Ghi chú 4x4",
        <>
          Đây là phiên bản đơn giản của mindmap:
          mỗi ý chính lại tách ra thành 4 ý nhỏ hơn,
          như trong hình minh hoạ. Cách này giúp bạn thấy cấu trúc
          ý rất rõ ràng.
        </>,
        image_importor("4X4"),
        "right"
      ),
      new DetailOfTips(
        "ABBREVIATION!",
        <>
          Arrange needed element's first letter
          in 1 words and so would save memory & 
          time by remember 1 word;
        </>,
        "Viết tắt",
        <>
          Lấy chữ cái đầu của các ý quan trọng và ghép thành
          một từ hoặc cụm từ dễ nhớ. Nhớ một từ nhưng chứa
          cả một nhóm thông tin phía sau → nhẹ não hơn.
        </>,
        image_importor("SWOT"),
        "right"
      ),

      new DetailOfTips(
        "you vs book cycle",
        <>
          listen and write the down what
          you had listen into a notebook as what
          you know and finally compare to your book
          if there are errors, then repeat or ask
        </>,
        "Chu trình bạn vs sách",
        <>
          Nghe/đọc xong, hãy viết lại vào vở theo cách
          bạn hiểu (không nhìn sách). Sau đó so sánh lại
          với sách: chỗ nào thiếu hoặc sai thì ghi chú,
          hỏi lại hoặc ôn lại. Cứ lặp lại chu trình đó.
        </>,
        image_importor("CYCLE"),
        "left"
      ),

      new DetailOfTips(
        "CORNELL method",
        <>
          Cornell states that the side part is for writting
          your questions and keyword, and the biggest is 
          the note which are the details and the downward
          square is used for summer<CITATE src="https://www.researchgate.net/publication/399574345_The_Influence_of_the_Cornell_Note-Taking_Method_on_Students'_Reading_Comprehension_of_Explanation_Text" n="7"/>
        </>,
        "Phương pháp Cornell",
        <>
          Cornell nói rằng phần cạnh bên dùng để ghi ý chính,
          phần giữa ghi nội dung chi tiết, phần cuối trang
          dùng để tóm tắt lại toàn bộ. Một trang vừa là ghi chú,
          vừa là bản tóm tắt.<CITATE src="https://www.researchgate.net/publication/399574345_The_Influence_of_the_Cornell_Note-Taking_Method_on_Students'_Reading_Comprehension_of_Explanation_Text" n="7"/>
        </>,
        image_importor("CORNELL"),
        "right",
        <iframe  src="https://www.youtube.com/embed/GKodBunEPuI?si=6ERiznbgXUVsTurE" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>,
        image_importor("Cornor")
      ),

      new DetailOfTips(
        "HIGHLIGHT!",
        <>
          only do it after reading full topic
          and have summerized in your own words
          but prefer using yelow hightlight because
           it constract best with black letters <CITATE src="https://www.shiftelearning.com/blog/how-do-colors-influence-learning#:~:text=4)%20Yellow:%20The%20Powerhouse%20for,studying%20in%20neutrally%2Dcolored%20environments." n="8"/>
        </>,
        "Tô đậm hiệu quả",
        <>
          Chỉ nên highlight sau khi bạn đã đọc hết chủ đề
          và tóm tắt lại bằng lời của mình. Highlight những chỗ
          thật sự là “then chốt”, và cuối cùng hãy ưu tiên dùng 
          màu vàng vì nó tương phản tốt nhất với chữ đen<CITATE src="https://www.shiftelearning.com/blog/how-do-colors-influence-learning#:~:text=4)%20Yellow:%20The%20Powerhouse%20for,studying%20in%20neutrally%2Dcolored%20environments." n="8"/> giúp bạn dễ nhớ hơn.
        </>,
        image_importor("highlight"),
        "left"
      ),
    

      new DetailOfTips(
        "summary & print",
        <>
          this is a google doc that would
          help you print all the tips,
          and explain the tips in more details + evidences{" "}
          <a
            href="https://docs.google.com/document/d/1qfUi1f6OYUYhAAmggj1jGT7vZiK1PzGi_ZmotVSADTo/edit?usp=sharing"
            target="_blank"
          >
            <button>THE GG DOC</button>
          </a>
        </>,
        "Tóm tắt & in ra",
        <>
          Đây là file <a
            href="https://docs.google.com/document/d/1qfUi1f6OYUYhAAmggj1jGT7vZiK1PzGi_ZmotVSADTo/edit?usp=sharing"
            target="_blank"
          >
            <button>THE GG DOC</button>
          </a> giúp bạn in toàn bộ
          các mẹo, kèm giải thích chi tiết hơn và dẫn chứng.
        </>
      ),
    ]
  ),
];
// Named export above; no default export to avoid import ambiguity