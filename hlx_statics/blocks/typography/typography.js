
/**
 * decorates the typography
 * @param {Element} block The title block element
 */
export default async function decorate(block) {
  console.log('typo!')
  let typography = block.querySelector('.typography > div')
    console.log(typography)
    typography.innerHTML = `
    <div class="spectrum">
  <p class="spectrum-Body spectrum-Body--sizeXXXL">BodyXXXL Text <em>BodyXXXL Emphasis</em> <strong>BodyXXXL Strong</strong>.</p>
  <p class="spectrum-Body spectrum-Body--sizeXXL">BodyXXL Text <em>BodyXXL Emphasis</em> <strong>BodyXXL Strong</strong>.</p>
  <p class="spectrum-Body spectrum-Body--sizeXL">BodyXL Text <em>BodyXL Emphasis</em> <strong>BodyXL Strong</strong>.</p>
  <p class="spectrum-Body spectrum-Body--sizeL">BodyL text <em>BodyL Emphasis</em> <strong>BodyL Strong</strong>.</p>
  <p class="spectrum-Body spectrum-Body--sizeM">BodyM Text <em>BodyM Emphasis</em> <strong>BodyM Strong</strong>.</p>
  <p class="spectrum-Body spectrum-Body--sizeS">BodyS Text <em>BodyS Emphasis</em> <strong>BodyS Strong</strong>.</p>
  <p class="spectrum-Body spectrum-Body--sizeXS">BodyXS Text <em>BodyXS Emphasis</em> <strong>BodyXS Strong</strong>.</p>
</div>
<br/>
<div class="spectrum">
  <p class="spectrum-Body spectrum-Body--sizeXXXL spectrum-Body--serif">BodyXXXL Text Serif <em>BodyXXXL Emphasis Serif</em> <strong>BodyXXXL Strong Serif</strong>.</p>
  <p class="spectrum-Body spectrum-Body--sizeXXL spectrum-Body--serif">BodyXXL Text Serif <em>BodyXXL Emphasis Serif</em> <strong>BodyXXL Strong Serif</strong>.</p>
  <p class="spectrum-Body spectrum-Body--sizeXXL spectrum-Body--serif">BodyXL Text Serif <em>BodyXL Emphasis Serif</em> <strong>BodyXL Strong Serif</strong>.</p>
  <p class="spectrum-Body spectrum-Body--sizeL spectrum-Body--serif">BodyL text Serif <em>BodyL Emphasis Serif</em> <strong>BodyL Strong Serif</strong>.</p>
  <p class="spectrum-Body spectrum-Body--sizeM spectrum-Body--serif">BodyM Text Serif <em>BodyM Emphasis Serif</em> <strong>BodyM Strong Serif</strong>.</p>
  <p class="spectrum-Body spectrum-Body--sizeS spectrum-Body--serif">BodyS Text Serif <em>BodyS Emphasis Serif</em> <strong>BodyS Strong Serif</strong>.</p>
  <p class="spectrum-Body spectrum-Body--sizeXS spectrum-Body--serif">BodyXS Text Serif <em>BodyXS Emphasis Serif</em> <strong>BodyXS Strong Serif</strong>.</p>
</div>

<div class="spectrum">
  <h1 class="spectrum-Heading spectrum-Heading--sizeXXXL">HeadingXXXL <em>Emphasis</em> <strong>Strong</strong>.</h1>
  <h1 class="spectrum-Heading spectrum-Heading--sizeXXL">HeadingXXL <em>Emphasis</em> <strong>Strong</strong>.</h1>
  <h1 class="spectrum-Heading spectrum-Heading--sizeXL">HeadingXL <em>Emphasis</em> <strong>Strong</strong>.</h1>
  <h2 class="spectrum-Heading spectrum-Heading--sizeL">HeadingL <em>Emphasis</em> <strong>Strong</strong>.</h2>
  <h3 class="spectrum-Heading spectrum-Heading--sizeM">HeadingM <em>Emphasis</em> <strong>Strong</strong>.</h3>
  <h4 class="spectrum-Heading spectrum-Heading--sizeS">HeadingS <em>Emphasis</em> <strong>Strong</strong>.</h4>
  <h5 class="spectrum-Heading spectrum-Heading--sizeXS">HeadingXS <em>Emphasis</em> <strong>Strong</strong>.</h5>
  <h6 class="spectrum-Heading spectrum-Heading--sizeXXS">HeadingXXS <em>Emphasis</em> <strong>Strong</strong>.</h6>
  <br/>
  <h1 class="spectrum-Heading spectrum-Heading--sizeXXXL spectrum-Heading--serif">HeadingXXXL Serif <em>Emphasis</em> <strong>Strong</strong>.</h1>
  <h1 class="spectrum-Heading spectrum-Heading--sizeXXL spectrum-Heading--serif">HeadingXXL Serif <em>Emphasis</em> <strong>Strong</strong>.</h1>
  <h1 class="spectrum-Heading spectrum-Heading--sizeXL spectrum-Heading--serif">HeadingXL Serif <em>Emphasis</em> <strong>Strong</strong>.</h1>
  <p class="spectrum-Heading spectrum-Heading--sizeL spectrum-Heading--serif">HeadingL Serif <em>Emphasis</em> <strong>Strong</strong>.</p>
  <h3 class="spectrum-Heading spectrum-Heading--sizeM spectrum-Heading--serif">HeadingM Serif <em>Emphasis</em> <strong>Strong</strong>.</h3>
  <h4 class="spectrum-Heading spectrum-Heading--sizeS spectrum-Heading--serif">HeadingS Serif <em>Emphasis</em> <strong>Strong</strong>.</h4>
  <h5 class="spectrum-Heading spectrum-Heading--sizeXS spectrum-Heading--serif">HeadingXS Serif <em>Emphasis</em> <strong>Strong</strong>.</h5>
  <h6 class="spectrum-Heading spectrum-Heading--sizeXXS spectrum-Heading--serif">HeadingXXS Serif <em>Emphasis</em> <strong>Strong</strong>.</h6>
</div>
    `

}



