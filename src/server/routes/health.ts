import express from 'express';

const health = (req: express.Request, res: express.Response) => {
    
    res.sendStatus(200);

}

export default health;