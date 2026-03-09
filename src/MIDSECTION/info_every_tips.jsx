import LOGO from "../image/LOGO.png";
import Main from './COLOR_CHANGE.jsx';

const images = import.meta.glob("../image/*.{png,jpg,jpeg,webp,gif,svg,mp4}", { eager: true });
/*return an object of file */
const imageFiles = Object.entries(images).map(([path, module]) => ({
  path,
  url: module.default
}));
/*convert it back to another form of object */

function image_importor(name, type = "image") {
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
  constructor(type, list, additional_material = null) {
    this._type = type;
    this._list = list;
    this._additional_material = additional_material
  }
  get type() {
    return this._type;
  }
  get list() {
    return this._list;
  }
  get additional_material(){
    return this._additional_material;
  };
}

/*change img into asset */
class DetailOfTips{
  constructor(header = "header", paragraph = "p", VNheader = "VN 1#", VNparagraph = "VN para !!!", asset = image_importor("LOGO", "image"), side="right", ){
    this._header = header;
    this._paragraph = paragraph;
    this._asset = asset;
    this._side = side;
    this._VNheader = VNheader;
    this._VNparagraph =VNparagraph;
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
}



export const list_of_tips = [
  new TypeOfTips(
    "PRE-LEARN",
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
          với chính bạn bằng cách tự hỏi: “Cái này sẽ
          giúp mình điều gì?”. Việc gì càng quan trọng
          thì bạn càng tự nhiên tập trung vào nó.
          Bước nhỏ này giống như soi lại để nhắc não:
          chuyện này <b>thật sự</b> quan trọng với mình.
        </>,
        image_importor("brain.svg"),
        "right"
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
          studies of Havard and British Columbia
          showed that doing excercises regulary
          grow your hippocampus a brain's region 
          associate with learning! because of that 
          edulience offer 1 month free trial of California
          claim it at your opinion section
        </>,
        "Vận động lâu dài",
        <>
          nghiên cứu Havard and british Columbia
          gợi ý rằng tập thể dục thường xuyên giúp
          não bộ lớn và vì vậy Edulience sẽ tặng bạn
          1 tháng tập ở California gym nhận nó ở phần
          ý kiến của bạn 
        </>,
        image_importor("dumbell"),
        "left"
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
        "most craving is last",
        <>
          find the thing you love to do and do it last,
          this gives u the urge to finish everything
          in order to do the thing you want to do
        </>,
        "thích nhất ở cuối",
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
          your brain need the nutrition and
          drinking low sugar matcha, water
          and eating salmon, walnuts,
        </>,
        "Chế độ não ăn ",
        <>
          Não cũng cần “dinh dưỡng tốt”.
          Hạn chế đồ quá nhiều đường, ưu tiên
          nước lọc, matcha ít đường, các thực phẩm
          như cá hồi, quả óc chó… để não hoạt động
          khoẻ và bền hơn.
        </>,
        image_importor("chicken"),
        "left"
      ),

      

      new DetailOfTips(
        "Strooper effect",
        <>
          this is a brain excercise that 
          trains the brain to handle disorder
          informations, which is the color
          and text, instruction: 1. press button<br/>
          2. read the color and not the text.

        </>,
        "Bài Strooper",
        <>
          Đây là 1 bài khởi động cho 
          bộ não cách sắp xếp thong tin mâu thuẫn
          với nhau được chứng minh bỡi tiến sĩ Strooper.
        </>,
        image_importor(<Main/>, ""),
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
          Don't remember anyformula but 
          instead write them on a note and 
          just do excercises, it allows for
          your mind to focus on critical thinking
          instead of small details
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
        "Repetition",
        "repeatition is mastery and learning how to do it helps a lot. There are 2 ways to do it, 1 spacial repeat ur knowledge at certain space and 2 mix the order up ",
        "Ôn lại thông minh",
        "Lặp lại là chìa khoá để nhớ lâu. Có hai cách mạnh: (1) Lặp lại theo khoảng cách thời gian (spaced repetition) – ôn lại sau 1 ngày, 3 ngày, 1 tuần…; (2) Trộn thứ tự khi ôn – không làm đúng một dạng bài mãi, mà xen kẽ nhiều dạng để não phải chủ động hơn."
      ),

      new DetailOfTips(
        "story telling",
        <>
          story like`the oxygen concentration
          we breath is heated by our body temperature,
          passes to ur lungs suface area` is an ex of
          using it to remember what influences gas exchange
        </>,
        "Kể chuyện kiến thức",
        <>
          Bạn có thể biến kiến thức khô khan thành một câu chuyện.
          Ví dụ: “Nồng độ oxy ta hít vào được sưởi ấm bởi nhiệt độ cơ thể,
          đi qua bề mặt phổi rộng…” – câu chuyện này giúp bạn nhớ
          các yếu tố ảnh hưởng đến trao đổi khí dễ hơn nhiều.
        </>,
        image_importor("storytelling"),
        "right"
      ),

      new DetailOfTips(
        "FEYNMAN PRESENTATION",
        <>
          Telling & recalling what you have learnt to 
          sonebody could be yourself, friends, allow u to 
          organize your thoughts to explain clearly hence 
          boost ur understanding abt it.
        </>,
        "FEYNMAN/Trình bày",
        <>
          Kể lại và trình bày những gì bạn đã học cho người khác
          (hoặc chính bản thân mình, bạn bè) buộc não phải sắp xếp lại
          ý cho rõ ràng. Quá trình đó giúp bạn hiểu sâu hơn nhiều
          so với chỉ đọc lại.
        </>,
        image_importor("PRESENTATION"),
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

  new TypeOfTips(
    "NOTE-TAKE",
    [
      new DetailOfTips(
        "1 sentence",
        <>
          summerize every elements are needed 
          to understand into a sentence, this 
          forces you to choose between words which
          activate your comprehension skill
        </>,
        "1 câu",
        <>
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
        "dedrive basics",
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
          Chia bài tập hoặc nội dung học thành các bước rõ ràng,
          giống như cách Cambridge hướng dẫn:
          Bước 1 làm gì, Bước 2 làm gì… Não sẽ dễ đi theo
          hơn là nhìn một khối thông tin lớn.
        </>,
        image_importor("dedrive"),
        "right"
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
          the side rectangle writes the main idea 
          main section retangle write the content details and
          the footer lower squarerecap overall idea.
        </>,
        "Phương pháp Cornell",
        <>
          Với Cornell, phần cạnh bên dùng để ghi ý chính,
          phần giữa ghi nội dung chi tiết, phần cuối trang
          dùng để tóm tắt lại toàn bộ. Một trang vừa là ghi chú,
          vừa là bản tóm tắt.
        </>,
        image_importor("CORNELL"),
        "right"
      ),

      new DetailOfTips(
        "HIGHLIGHT!",
        <>
          only do it after reading full topic
          and have summerized in your own words
        </>,
        "Tô đậm hiệu quả",
        <>
          Chỉ nên highlight sau khi bạn đã đọc hết chủ đề
          và tóm tắt lại bằng lời của mình. Highlight những chỗ
          thật sự là “then chốt”, không tô cả trang.
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