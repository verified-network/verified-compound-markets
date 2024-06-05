import {motion} from "framer-motion"
import compoundImg from "../../web_public/images/compound-192.png"

export const Loader = () => {
    return(
        <div className="loader-container">
            <motion.img 
            height="100px"
            width="100px"
            src={compoundImg}
            alt="Loading..."
            animate={{
                rotate: 360,
                scale: [1, 1.5, 1]
            }}
            transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear"
            }}
            />
        </div>
    )
}