const jwt = require('jsonwebtoken');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { GetCommand, PutCommand, DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-northeast-2' });
const ddbDocClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event, context) => {
  console.log(`EVENT: ${JSON.stringify(event)}`);

  // API Gateway에서 Authorization 헤더를 전달
  const accessToken = event.headers.Authorization;

  if (!accessToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: "Authorization token is missing" })
    };
  }

  try {
    const decoded = jwt.decode(accessToken, { complete: true });

    if (!decoded || !decoded.payload || !decoded.payload.sub) {
      throw new Error("Invalid token");
    }

    console.log("payload: ", decoded.payload);
    const sub = decoded.payload.sub;
    console.log("sub: ", sub);

    const getParams = {
      TableName: 'UserInfoDB-dev',
      Key: { userId: sub }, // 파티션 키를 'userId'로 가정
    };

    const result = await ddbDocClient.send(new GetCommand(getParams));

    if (result.Item) {
      console.log("User already exists in DynamoDB:", result.Item);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "User logged in successfully", user: result.Item }),
      };
    } else {
      const putParams = {
        TableName: 'UserInfoDB-dev',
        Item: {
          userId: sub,
          createdAt: new Date().toISOString()
        },
      };

      await ddbDocClient.send(new PutCommand(putParams));
      console.log("New user added to DynamoDB:", putParams.Item);

      return {
        statusCode: 200,
        body: JSON.stringify({ message: "User registered successfully", user: putParams.Item }),
      };
    }
  } catch (error) {
    console.error("Error processing request:", error);
    if (error.name === 'ResourceNotFoundException') {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "DynamoDB table not found", error: error.message }),
      };
    }
    // 다른 특정 오류에 대한 처리 추가
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error", error: error.message }),
    };
  }
};