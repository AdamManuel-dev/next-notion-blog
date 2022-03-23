/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * Sick Graphics 🛹
 */
export function bootstrap() {
  console.clear()
  console.log(`

=====================================================

___      ___       __       ________    _______    
|"  \\    /"  |     /""\\     |"      "\\  /"     "|   
 \\   \\  //   |    /    \\    (.  ___  :)(: ______)   
 /\\\\  \\/.    |   /' /\\  \\   |: \\   ) || \\/    |     
|: \\.        |  //  __'  \\  (| (___\\ || // ___)_    
|.  \\    /:  | /   /  \\\\  \\ |:       :)(:      "|   
|___|\\__/|___|(___/    \\___)(________/  \\_______)   
                                                    
                   _______  ___  ___                                  
                  |   _  "\\|"  \\/"  |                                 
                  (. |_)  :)\\   \\  /                                  
                  |:     \\/  \\\\  \\/                                   
                  (|  _  \\\\  /   /                                    
                  |: |_)  :)/   /                                     
                  (_______/|___/                                      
                                                    
      __       ________       __       ___      ___ 
     /""\\     |"      "\\     /""\\     |"  \\    /"  |
    /    \\    (.  ___  :)   /    \\     \\   \\  //   |
   /' /\\  \\   |: \\   ) ||  /' /\\  \\    /\\\\  \\/.    |
  //  __'  \\  (| (___\\ || //  __'  \\  |: \\.        |
 /   /  \\\\  \\ |:       :)/   /  \\\\  \\ |.  \\    /:  |
(___/    \\___)(________/(___/    \\___)|___|\\__/|___|
                                                                   
                   ___      ___                                       
                  |"  \\    /"  |                                      
                   \\   \\  //   |                                      
                   /\\\\  \\/.    |                                      
                  |: \\.        |  _____                               
                  |.  \\    /:  | ))_  ")                              
                  |___|\\__/|___|(_____(                               
                                                                                                                                                           
=====================================================



\t\t|-----------------------------------|
\t\t| My Contact Info                   |
\t\t|-----------------------------------|
\t\t| Email: \t\t\tadam@manuel.dev\t|
\t\t| Website: \thttps://adam.manuel.dev\t|
\t\t|-----------------------------------|





If you found this, hit me up. I'd be interested to
know why you were looking this closely at my blog 😉




`)
  // Disable logger to keep this graphic at the top of the console.log
  if (process.env.NODE_ENV === 'production') {
    console.log = (...__) => {
      /** noop */
    }
    console.error = (...__) => {
      /** noop */
    }
    console.info = (...__) => {
      /** noop */
    }
    console.warn = (...__) => {
      /** noop */
    }
    console.debug = (...__) => {
      /** noop */
    }
  }
}
