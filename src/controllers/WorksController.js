const WorksModel = require("../models/WorksModel");
exports.WorkCreate = async (req, res) => {
  try {
    const reqBody = req.body;
    const createdBy = req.headers["email"]; // Use the email from the token

    // Check if all required fields are present in the request body
    const requiredFields = ["workTitle", "workDescription", "workStatus"];
    for (const field of requiredFields) {
      if (!reqBody[field]) {
        return res
          .status(200)
          .json({ status: "fail", data: `Missing required field: ${field}` });
      }
    }

    const existingWork = await WorksModel.findOne({
      workTitle: reqBody.workTitle,
      workDescription: reqBody.workDescription,
      createdBy: createdBy,
    });

    if (existingWork) {
      return res.status(200).json({
        status: "fail",
        data: "You've already posted this work.",
        email: createdBy,
      });
    }

    // The work does not exist, so create it in the database
    reqBody.createdBy = createdBy;
    let result = await WorksModel.create(reqBody);
    res.status(200).json({ status: "success", data: result });
  } catch (e) {
    res.status(500).json({ status: "fail", data: e });
  }
};
exports.WorkAllList = async (req, res) => {
  try {
    let email = req.headers["email"];
    let Query = { createdBy: email };

    // Count the number of items
    let count = await WorksModel.countDocuments({
      createdBy: email,
    });

    let result = await WorksModel.find(Query);
    res.status(200).json({ status: "success", count: count, data: result });
  } catch (e) {
    res.status(200).json({ status: "fail", data: e });
  }
};

exports.WorkListByStatus = async (req, res) => {
  try {
    let status = req.params.status;
    let email = req.headers["email"];

    // Count the number of items
    let count = await WorksModel.countDocuments({
      workStatus: status,
      createdBy: email,
    });

    // Retrieve the items
    let result = await WorksModel.find({
      workStatus: status,
      createdBy: email,
    });

    // Print the count and send the response
    res.status(200).json({
      status: "success",
      count: count,
      data: result,
    });
  } catch (e) {
    res.status(500).json({ status: "fail", error: e });
  }
};

exports.WorkStatusCountIndividual = async (req, res) => {
  try {
    let email = req.headers["email"];
    let result = await WorksModel.aggregate([
      { $match: { createdBy: email } },
      {
        $group: {
          _id: "$workStatus", // Group by work status
          count: { $sum: 1 }, // Count occurrences of each work status
        },
      },
      {
        $group: {
          _id: null, // Group to calculate the total count
          total: { $sum: "$count" },
          statuses: { $push: { status: "$_id", count: "$count" } }, // Push each status count into an array
        },
      },
      {
        $project: {
          _id: 0, // Exclude the default _id field
          total: 1,
          statuses: 1,
        },
      },
    ]);

    if (result.length > 0) {
      res.status(200).json({ status: "success", data: result[0] });
    } else {
      // If there are no works, return 0 counts
      res.status(200).json({
        status: "success",
        message: "No Work Found",
        data: { total: 0, statuses: [] },
      });
    }
  } catch (e) {
    res.status(500).json({ status: "fail", data: e });
  }
};

exports.WorkStatusUpdate = async (req, res) => {
  try {
    let id = req.params.id; // extracting id from url
    let email = req.headers["email"]; //extracting email from header
    let status = req.params.status; // extracting status from url

    // Check if the specified id is associated with the provided email
    let work = await WorksModel.findOne({ _id: id, createdBy: email });

    if (!work) {
      return res.status(200).json({
        status: "fail",
        data: "Unauthorized - The specified id is not associated with the provided email.",
      });
    }

    // If the id is associated with the provided email, update the work status
    let Query = { _id: id, createdBy: email };
    let reqBody = { workStatus: status };
    let result = await WorksModel.updateOne(Query, reqBody);

    res.status(200).json({ status: "success", data: result });
  } catch (e) {
    res.status(500).json({ status: "fail", data: e });
  }
};

//---------------Just Count the total Work-----------

// exports.WorkStatusCountTotal = async (req, res) => {
//   try {
//     let email = req.headers["email"];
//     let result = await WorksModel.aggregate([
//       { $match: { createdBy: email } },
//       { $group: { _id: "$status", sum: { $count: {} } } },
//     ]);
//     res.status(200).json({ status: "success", data: result });
//   } catch (e) {
//     res.status(500).json({ status: "fail", data: e });
//   }
// };

//---------------Count Total Work and Group By Status-----------

exports.WorkUpdate = async (req, res) => {
  try {
    const email = req.headers["email"];
    const id = req.params.id;
    const query = { createdBy: email, _id: id };

    const existingWork = await WorksModel.findOne(query);

    if (!existingWork) {
      return res.status(404).json({ status: "fail", data: "Work not found" });
    }

    const updatedFields = req.body;

    const result = await WorksModel.updateOne(query, updatedFields);
    console.log(result);

    if (result) {
      res.status(200).json({ status: "success", data: result });
    } else {
      res.status(400).json({ status: "fail", data: "No data updated" });
    }
  } catch (e) {
    res.status(500).json({ status: "fail", error: e });
  }
};

exports.WorkDelete = async (req, res) => {
  try {
    let id = req.params.id;
    let email = req.headers["email"];
    let Query = { _id: id, createdBy: email };
    let result = await WorksModel.deleteOne(Query);
    res.status(200).json({ status: "success", data: "Work Deleted" });
  } catch (e) {
    res.status(200).json({ status: "fail", data: e });
  }
};

exports.WorkSearch = async (req, res) => {
  try {
    let email = req.headers["email"];
    let searchText = req.query.q;
    let results = await WorksModel.find(
      {
        createdBy: email,
        $text: { $search: searchText },
      },
      {
        score: { $meta: "textScore" },
      }
    ).sort({ score: { $meta: "textScore" } });

    if (results.length > 0) {
      res.status(200).json({ status: "success", data: results });
    } else {
      res.status(200).json({ status: "fail", data: "No results found" });
    }
  } catch (e) {
    res.status(500).json({ status: "fail", error: e });
    console.log(e);
  }
};
